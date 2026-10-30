import { DatabaseSync, backup as sqliteBackup } from "node:sqlite";
import { randomUUID } from "node:crypto";
import {
  mkdirSync,
  chmodSync,
  closeSync,
  openSync,
  existsSync,
  lstatSync,
} from "node:fs";
import path from "node:path";
import {
  domains,
  fieldsFor,
  type StoredRecord,
} from "../operations/domains.ts";
import { validatePayload } from "../operations/validation.ts";

export class LocalStoreError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
export type LocalProject = {
  id: string;
  name: string;
  deadline: string;
  budget_won: number;
};
const SCHEMA = `
create table identity (id text primary key, name text not null) strict;
create table projects (id text primary key, name text not null, deadline text not null, budget_won integer not null check(budget_won>=0)) strict;
create table records (
 id text primary key, project_id text not null references projects(id), kind text not null,
 payload text not null check(json_valid(payload) and json_type(payload)='object'),
 version integer not null check(version>0), created_at text not null, updated_at text not null,
 created_by text not null references identity(id), unique(project_id,id)
) strict;
create index records_kind on records(project_id,kind);
create unique index allocation_category on records(project_id,json_extract(payload,'$.fund'),json_extract(payload,'$.category')) where kind='allocations';
create table record_links (
 project_id text not null, record_id text not null, field text not null, target_id text not null,
 foreign key(project_id,record_id) references records(project_id,id),
 foreign key(project_id,target_id) references records(project_id,id), primary key(record_id,field,target_id)
) strict;
create table audit_logs (
 id integer primary key autoincrement, project_id text not null references projects(id), actor_id text not null references identity(id),
 entity_id text not null, action text not null, before_value text, after_value text not null, occurred_at text not null
) strict;
create trigger no_record_delete before delete on records begin select raise(abort,'RECORD_DELETE_FORBIDDEN'); end;
create trigger immutable_record before update on records when old.kind in ('expenses','evidence') or (old.kind='payments' and json_extract(old.payload,'$.status')='paid') begin select raise(abort,'IMMUTABLE_RECORD'); end;
create trigger no_audit_update before update on audit_logs begin select raise(abort,'AUDIT_IMMUTABLE'); end;
create trigger no_audit_delete before delete on audit_logs begin select raise(abort,'AUDIT_IMMUTABLE'); end;
create trigger audit_insert after insert on records begin
 insert into audit_logs(project_id,actor_id,entity_id,action,before_value,after_value,occurred_at)
 values(new.project_id,(select id from identity),new.id,'INSERT',null,json_object('id',new.id,'project_id',new.project_id,'kind',new.kind,'payload',json(new.payload),'version',new.version,'created_at',new.created_at,'updated_at',new.updated_at,'created_by',new.created_by),new.updated_at);
end;
create trigger audit_update after update on records begin
 insert into audit_logs(project_id,actor_id,entity_id,action,before_value,after_value,occurred_at)
 values(new.project_id,(select id from identity),new.id,'UPDATE',json_object('id',old.id,'project_id',old.project_id,'kind',old.kind,'payload',json(old.payload),'version',old.version,'created_at',old.created_at,'updated_at',old.updated_at,'created_by',old.created_by),json_object('id',new.id,'project_id',new.project_id,'kind',new.kind,'payload',json(new.payload),'version',new.version,'created_at',new.created_at,'updated_at',new.updated_at,'created_by',new.created_by),new.updated_at);
end;
`;
export function localDataDirectory() {
  if (process.env.SOMSSI_DATA_DIR)
    return path.resolve(process.env.SOMSSI_DATA_DIR);
  let root = process.cwd();
  for (let i = 0; i < 6; i++) {
    if (existsSync(path.join(root, "apps/web/package.json")))
      return path.join(root, ".somssi-local");
    const parent = path.dirname(root);
    if (parent === root) break;
    root = parent;
  }
  return path.resolve(process.cwd(), ".somssi-local");
}
function privateDirectory(dir: string) {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  if (lstatSync(dir).isSymbolicLink())
    throw new LocalStoreError(
      503,
      "로컬 저장 폴더는 심볼릭 링크일 수 없습니다.",
    );
  chmodSync(dir, 0o700);
}
export class LocalStore {
  readonly db: DatabaseSync;
  readonly project: LocalProject;
  readonly userId: string;
  readonly directory: string;
  constructor(directory = localDataDirectory()) {
    this.directory = path.resolve(directory);
    // Never serve personal data from a Next.js public folder.
    if (
      this.directory
        .split(path.sep)
        .some((p) =>
          [
            "public",
            ".git",
            ".next",
            "original-templates",
            "reference-sources",
          ].includes(p),
        )
    )
      throw new LocalStoreError(
        503,
        "이 위치는 로컬 운영 저장소로 사용할 수 없습니다.",
      );
    privateDirectory(this.directory);
    const filename = path.join(this.directory, "store.sqlite");
    try {
      const fd = openSync(filename, "wx", 0o600);
      closeSync(fd);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
    }
    if (lstatSync(filename).isSymbolicLink())
      throw new LocalStoreError(503, "DB 파일은 심볼릭 링크일 수 없습니다.");
    chmodSync(filename, 0o600);
    this.db = new DatabaseSync(filename);
    try {
      this.db.exec(
        "pragma foreign_keys=on; pragma busy_timeout=5000; pragma journal_mode=WAL; pragma synchronous=FULL;",
      );
      this.db.exec("begin immediate");
      try {
        const version = Number(
          this.db.prepare("pragma user_version").get()!.user_version,
        );
        if (version === 0) {
          if (
            this.db
              .prepare(
                "select name from sqlite_master where type='table' and name not like 'sqlite_%'",
              )
              .get()
          )
            throw new Error("기존 DB 형식을 확인할 수 없습니다.");
          this.db.exec(SCHEMA);
          this.db
            .prepare("insert into identity values(?,?)")
            .run(randomUUID(), "이 컴퓨터의 로컬 사용자");
          this.db
            .prepare("insert into projects values(?,?,?,?)")
            .run(
              randomUUID(),
              "SOMSSI 2R",
              "2026-11-23T14:00:00+09:00",
              2_000_000,
            );
        } else if (version !== 1)
          throw new Error(
            "지원하지 않는 DB 버전입니다. 원본을 보존하고 앱 버전을 확인해 주세요.",
          );
        this.db.exec("pragma user_version=1; commit");
      } catch (error) {
        this.db.exec("rollback");
        throw error;
      }
      this.project = this.db
        .prepare("select * from projects")
        .get() as unknown as LocalProject;
      this.userId = String(
        this.db.prepare("select id from identity").get()!.id,
      );
      if (!this.project || !this.userId)
        throw new Error("로컬 프로젝트 정보를 확인할 수 없습니다.");
    } catch (error) {
      this.db.close();
      throw error;
    }
  }
  close() {
    this.db.close();
  }
  private row(
    row: Record<string, unknown> | undefined,
  ): StoredRecord | undefined {
    return row
      ? ({ ...row, payload: JSON.parse(String(row.payload)) } as StoredRecord)
      : undefined;
  }
  get(id: string) {
    return this.row(
      this.db
        .prepare("select * from records where id=? and project_id=?")
        .get(id, this.project.id),
    );
  }
  list() {
    return this.db
      .prepare(
        "select * from records where project_id=? order by created_at,id",
      )
      .all(this.project.id)
      .map((r) => this.row(r)!);
  }
  audits() {
    return this.db
      .prepare("select * from audit_logs where project_id=? order by id")
      .all(this.project.id)
      .map((r) => ({
        ...r,
        before_value: r.before_value
          ? JSON.parse(String(r.before_value))
          : null,
        after_value: JSON.parse(String(r.after_value)),
      }));
  }
  snapshot() {
    this.db.exec("begin");
    try {
      const value = {
        format: "somssi-local-json-v1",
        exportedAt: new Date().toISOString(),
        project: this.project,
        identity: { id: this.userId, name: "이 컴퓨터의 로컬 사용자" },
        records: this.list(),
        audit: this.audits(),
      };
      this.db.exec("commit");
      return value;
    } catch (e) {
      this.db.exec("rollback");
      throw e;
    }
  }
  async copyDatabase(filename: string) {
    await sqliteBackup(this.db, filename);
    chmodSync(filename, 0o600);
  }
  evidencePath(record: StoredRecord) {
    const value = String(record.payload.storagePath);
    const escapedId = record.id.replaceAll("-", "\\-");
    const expected = new RegExp(
      `^${this.project.id}/${this.userId}/${escapedId}\\.(pdf|png|jpg|jpeg|webp|docx|xlsx)$`,
    );
    if (record.kind !== "evidence" || !expected.test(value))
      throw new LocalStoreError(422, "증빙 경로가 일치하지 않습니다.");
    return path.join(this.directory, "evidence", ...value.split("/"));
  }
  write(
    kind: string,
    id: string,
    raw: unknown,
    expectedVersion: number,
  ): StoredRecord {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id,
      ) ||
      !Number.isSafeInteger(expectedVersion) ||
      expectedVersion < 0
    )
      throw new LocalStoreError(422, "유효한 ID와 버전이 필요합니다.");
    const p = validatePayload(kind, raw);
    this.db.exec("begin immediate");
    try {
      const old = this.get(id);
      if ((old?.version ?? 0) !== expectedVersion)
        throw new LocalStoreError(
          409,
          "다른 변경과 충돌했습니다. 새로고침 후 다시 확인해 주세요.",
        );
      if (
        old &&
        (old.kind !== kind ||
          domains[kind].immutable ||
          (kind === "payments" && old.payload.status === "paid"))
      )
        throw new LocalStoreError(
          403,
          "원장·결제 완료·증빙 원본을 수정할 수 없습니다.",
        );
      const links: { field: string; target: string }[] = [];
      for (const field of fieldsFor(kind)) {
        if (!field.ref || p[field.key] === null || p[field.key] === undefined)
          continue;
        const ids =
          field.type === "refs"
            ? (p[field.key] as string[])
            : [String(p[field.key])];
        for (const target of ids) {
          const linked = this.get(target);
          if (target === id || !linked || linked.kind !== field.ref)
            throw new LocalStoreError(
              422,
              `${field.label}의 연결 항목을 확인해 주세요.`,
            );
          links.push({ field: field.key, target });
        }
      }
      if (
        kind === "payments" &&
        this.get(String(p.participantId))!.payload.pilotId !== p.pilotId
      )
        throw new LocalStoreError(
          422,
          "참가자와 파일럿 회차가 일치하지 않습니다.",
        );
      if (
        kind === "participants" &&
        old &&
        old.payload.pilotId !== p.pilotId &&
        this.db
          .prepare("select 1 from record_links where target_id=? limit 1")
          .get(id)
      )
        throw new LocalStoreError(
          422,
          "결제에 연결된 참가자의 회차는 바꿀 수 없습니다.",
        );
      if (kind === "partners")
        for (const [field, type] of [
          ["loiEvidenceId", "협력의향서(LOI)"],
          ["contractEvidenceId", "계약서"],
        ])
          if (
            p[field] !== null &&
            this.get(String(p[field]))!.payload.evidenceType !== type
          )
            throw new LocalStoreError(
              422,
              `${type} 유형의 증빙을 선택해 주세요.`,
            );
      if (kind === "expenses" && p.correctionOfId !== null) {
        const original = this.get(String(p.correctionOfId))!;
        if (
          original.payload.correctionOfId !== null ||
          ["fund", "category", "vendor", "pilotId"].some(
            (k) => original.payload[k] !== p[k],
          )
        )
          throw new LocalStoreError(
            422,
            "정정은 원거래와 자금·비목·거래처·회차가 같아야 합니다.",
          );
        const corrections = this.db
          .prepare(
            "select coalesce(sum(cast(json_extract(payload,'$.amountWon') as integer)),0) as total from records where kind='expenses' and json_extract(payload,'$.correctionOfId')=? and project_id=?",
          )
          .get(original.id, this.project.id)!;
        if (
          Number(original.payload.amountWon) +
            Number(corrections.total) +
            Number(p.amountWon) <
          0
        )
          throw new LocalStoreError(
            422,
            "정정 금액이 원거래 잔액을 초과합니다.",
          );
      }
      if (kind === "evidence") {
        this.evidencePath({
          id,
          project_id: this.project.id,
          kind,
          payload: p,
          version: 1,
          created_at: "",
          updated_at: "",
          created_by: this.userId,
        });
        if (!/^[a-f0-9]{64}$/.test(String(p.sha256)))
          throw new LocalStoreError(422, "증빙 해시를 확인해 주세요.");
      }
      const now = new Date().toISOString();
      if (old) {
        this.db
          .prepare(
            "update records set payload=?,version=version+1,updated_at=? where id=? and version=?",
          )
          .run(JSON.stringify(p), now, id, expectedVersion);
        this.db.prepare("delete from record_links where record_id=?").run(id);
      } else
        this.db
          .prepare("insert into records values(?,?,?,?,?,?,?,?)")
          .run(
            id,
            this.project.id,
            kind,
            JSON.stringify(p),
            1,
            now,
            now,
            this.userId,
          );
      for (const link of links)
        this.db
          .prepare("insert into record_links values(?,?,?,?)")
          .run(this.project.id, id, link.field, link.target);
      const record = this.get(id)!;
      this.db.exec("commit");
      return record;
    } catch (error) {
      this.db.exec("rollback");
      if (
        error instanceof Error &&
        error.message.includes("UNIQUE constraint failed")
      )
        throw new LocalStoreError(
          409,
          "같은 ID 또는 자금·비목의 기록이 이미 있습니다.",
        );
      throw error;
    }
  }
}
