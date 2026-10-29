import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import {
  mkdtemp,
  mkdir,
  chmod,
  readFile,
  writeFile,
  rm,
  stat,
  open,
} from "node:fs/promises";
import { constants, createReadStream, createWriteStream } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createGzip, createGunzip } from "node:zlib";
import { StringDecoder } from "node:string_decoder";
import { LocalStore } from "./store.ts";
import { validatePayload } from "../operations/validation.ts";
const MAX_TOTAL = 512 * 1024 * 1024,
  MAX_ENTRY = 64 * 1024 * 1024;
const hash = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
async function* archiveLines(filename: string) {
  const source = createReadStream(filename),
    unzip = createGunzip(),
    decoder = new StringDecoder("utf8");
  source.on("error", (error) => unzip.destroy(error));
  source.pipe(unzip);
  let pending = "",
    total = 0,
    searched = 0;
  try {
    for await (const chunk of unzip) {
      total += chunk.length;
      if (total > Math.ceil((MAX_TOTAL * 4) / 3) + 4 * 1024 * 1024)
        throw new Error("백업 압축 해제 한도를 초과했습니다.");
      pending += decoder.write(chunk);
      let index: number;
      while ((index = pending.indexOf("\n", searched)) >= 0) {
        if (index > Math.ceil((MAX_ENTRY * 4) / 3) + 1024)
          throw new Error("백업 항목이 너무 큽니다.");
        yield pending.slice(0, index);
        pending = pending.slice(index + 1);
        searched = 0;
      }
      searched = pending.length;
      if (pending.length > Math.ceil((MAX_ENTRY * 4) / 3) + 1024)
        throw new Error("백업 항목이 너무 큽니다.");
    }
    pending += decoder.end();
    if (pending) yield pending;
  } finally {
    source.destroy();
    unzip.destroy();
  }
}
const safePath = (p: string) =>
  p === "store.sqlite" ||
  /^evidence\/[a-f0-9-]{36}\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.(pdf|png|jpg|jpeg|webp|docx|xlsx)$/.test(
    p,
  );
type ArchiveFile = { path: string; size: number; sha256: string };
export async function createLocalArchive(store: LocalStore) {
  const temp = await mkdtemp(path.join(tmpdir(), "somssi-backup-"));
  await chmod(temp, 0o700);
  try {
    const snapshot = path.join(temp, "store.sqlite");
    await store.copyDatabase(snapshot);
    const check = new DatabaseSync(snapshot, { readOnly: true });
    let evidence: { payload: string; id: string }[];
    try {
      evidence = check
        .prepare(
          "select id,payload from records where kind='evidence' order by id",
        )
        .all() as unknown as typeof evidence;
    } finally {
      check.close();
    }
    const entries: {
      path: string;
      filename: string;
      expectedHash?: string;
      expectedSize?: number;
    }[] = [{ path: "store.sqlite", filename: snapshot }];
    for (const r of evidence) {
      const payload = JSON.parse(r.payload);
      const record = store.get(r.id);
      if (!record) throw new Error("스냅샷 증빙이 없습니다.");
      entries.push({
        path: `evidence/${payload.storagePath}`,
        filename: store.evidencePath(record),
        expectedHash: payload.sha256,
        expectedSize: payload.size,
      });
    }
    const manifest: ArchiveFile[] = [];
    let total = 0;
    for (const entry of entries) {
      const handle = await open(
        entry.filename,
        constants.O_RDONLY | constants.O_NOFOLLOW,
      );
      let bytes: Buffer;
      try {
        const info = await handle.stat();
        if (!info.isFile() || info.size > MAX_ENTRY)
          throw new Error("백업 항목 한도(64MB)를 초과했습니다.");
        total += info.size;
        if (total > MAX_TOTAL)
          throw new Error("전체 백업 한도(512MB)를 초과했습니다.");
        bytes = await handle.readFile();
      } finally {
        await handle.close();
      }
      const digest = hash(bytes);
      if (
        entry.expectedHash &&
        (entry.expectedHash !== digest || entry.expectedSize !== bytes.length)
      )
        throw new Error("증빙 원본의 크기 또는 해시가 일치하지 않습니다.");
      manifest.push({ path: entry.path, size: bytes.length, sha256: digest });
    }
    async function* lines() {
      yield JSON.stringify({
        format: "somssi-local-backup-v1",
        createdAt: new Date().toISOString(),
        files: manifest,
      }) + "\n";
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i],
          bytes = await readFile(entry.filename);
        if (
          bytes.length !== manifest[i].size ||
          hash(bytes) !== manifest[i].sha256
        )
          throw new Error("백업 중 파일이 변경되었습니다. 다시 시도해 주세요.");
        yield JSON.stringify({
          path: entry.path,
          base64: bytes.toString("base64"),
        }) + "\n";
      }
    }
    const archive = path.join(temp, "SOMSSI.somssi-backup.gz");
    await pipeline(
      Readable.from(lines()),
      createGzip(),
      createWriteStream(archive, { mode: 0o600 }),
    );
    return {
      filename: archive,
      cleanup: () => rm(temp, { recursive: true, force: true }),
    };
  } catch (error) {
    await rm(temp, { recursive: true, force: true });
    throw error;
  }
}
// Restore only into a brand-new directory. The live database is never replaced.
export async function restoreLocalArchive(filename: string, target: string) {
  const destination = path.resolve(target);
  if (
    destination
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
    throw new Error("이 위치로 복구할 수 없습니다.");
  if ((await stat(filename)).size > MAX_TOTAL)
    throw new Error("백업 파일이 너무 큽니다.");
  await mkdir(destination, { mode: 0o700 }); // EEXIST is intentionally fatal, including empty existing folders.
  const written = new Set<string>();
  let expected: Map<string, ArchiveFile> | undefined;
  let total = 0;
  try {
    for await (const line of archiveLines(filename)) {
      if (line.length > Math.ceil((MAX_ENTRY * 4) / 3) + 1024)
        throw new Error("백업 항목이 너무 큽니다.");
      const value = JSON.parse(line);
      if (!expected) {
        if (
          value.format !== "somssi-local-backup-v1" ||
          !Array.isArray(value.files) ||
          value.files.length < 1 ||
          value.files.length > 10001
        )
          throw new Error("지원하지 않는 백업입니다.");
        expected = new Map();
        for (const item of value.files as ArchiveFile[]) {
          if (
            !item ||
            !safePath(item.path) ||
            expected.has(item.path) ||
            !Number.isSafeInteger(item.size) ||
            item.size < 0 ||
            item.size > MAX_ENTRY ||
            !/^[0-9a-f]{64}$/.test(item.sha256)
          )
            throw new Error("백업 목록이 올바르지 않습니다.");
          total += item.size;
          if (total > MAX_TOTAL) throw new Error("백업 합계가 너무 큽니다.");
          expected.set(item.path, item);
        }
        if (!expected.has("store.sqlite"))
          throw new Error("DB 스냅샷이 없습니다.");
        continue;
      }
      const item = expected.get(value.path);
      if (
        !item ||
        written.has(value.path) ||
        typeof value.base64 !== "string" ||
        !/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
          value.base64,
        )
      )
        throw new Error("백업 항목이 올바르지 않습니다.");
      const bytes = Buffer.from(value.base64, "base64");
      if (bytes.length !== item.size || hash(bytes) !== item.sha256)
        throw new Error("백업 해시/크기 검증에 실패했습니다.");
      const output = path.join(destination, ...item.path.split("/"));
      await mkdir(path.dirname(output), { recursive: true, mode: 0o700 });
      await writeFile(output, bytes, { flag: "wx", mode: 0o600 });
      written.add(item.path);
    }
    if (!expected || written.size !== expected.size)
      throw new Error("누락된 백업 항목이 있습니다.");
    const db = new DatabaseSync(path.join(destination, "store.sqlite"), {
      readOnly: true,
    });
    try {
      if (
        db.prepare("pragma user_version").get()?.user_version !== 1 ||
        db.prepare("pragma integrity_check").get()?.integrity_check !== "ok" ||
        db.prepare("pragma foreign_key_check").all().length
      )
        throw new Error("DB 무결성 검사에 실패했습니다.");
      const actor = String(db.prepare("select id from identity").get()?.id),
        project = String(db.prepare("select id from projects").get()?.id);
      const referenced = new Set(["store.sqlite"]);
      for (const row of db.prepare("select * from records").all()) {
        const payload = validatePayload(
          String(row.kind),
          JSON.parse(String(row.payload)),
        );
        if (row.project_id !== project || row.created_by !== actor)
          throw new Error("프로젝트/로컬 사용자 식별자가 일치하지 않습니다.");
        const latest = db
          .prepare(
            "select after_value from audit_logs where entity_id=? order by id desc limit 1",
          )
          .get(row.id);
        if (
          !latest ||
          JSON.parse(String(latest.after_value)).version !== row.version ||
          JSON.stringify(JSON.parse(String(latest.after_value)).payload) !==
            JSON.stringify(payload)
        )
          throw new Error("기록과 감사 이력이 일치하지 않습니다.");
        if (row.kind === "evidence") {
          const relative = `evidence/${payload.storagePath}`,
            item = expected.get(relative);
          if (
            !relative.startsWith(`evidence/${project}/${actor}/${row.id}.`) ||
            !item ||
            item.sha256 !== payload.sha256 ||
            item.size !== payload.size
          )
            throw new Error("증빙 메타데이터가 일치하지 않습니다.");
          referenced.add(relative);
        }
      }
      if (referenced.size !== expected.size)
        throw new Error("백업에 알 수 없는 파일이 포함되어 있습니다.");
    } finally {
      db.close();
    }
    return destination;
  } catch (error) {
    await rm(destination, { recursive: true, force: true });
    throw error;
  }
}
