import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { domains, fieldsFor } from "../apps/web/lib/operations/domains.ts";
import { validatePayload } from "../apps/web/lib/operations/validation.ts";
let db;
const project = randomUUID(),
  otherProject = randomUUID();
const owner = randomUUID(),
  editor = randomUUID(),
  viewer = randomUUID(),
  outsider = randomUUID();
const defaults = (kind, values = {}) =>
  Object.fromEntries(
    fieldsFor(kind).map((f) => [
      f.key,
      Object.hasOwn(values, f.key)
        ? values[f.key]
        : f.type === "refs"
          ? []
          : f.type === "boolean"
            ? false
            : f.key === "source"
              ? "isolated test"
              : f.type === "select"
                ? f.options[0]
                : f.required
                  ? f.type === "number"
                    ? 0
                    : f.type === "date"
                      ? "2026-11-01"
                      : f.type === "datetime"
                        ? "2026-11-01T00:00:00+09:00"
                        : "test"
                  : null,
    ]),
  );
const acting = (actor, fn) =>
  db.transaction(async (tx) => {
    await tx.exec("set local role authenticated");
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [
      actor,
    ]);
    return fn(tx);
  });
const write = (
  actor,
  kind,
  payload,
  id = randomUUID(),
  version = 0,
  pid = project,
) =>
  acting(actor, (tx) =>
    tx.query("select public.somssi_write_record($1,$2,$3,$4,$5) as record", [
      pid,
      id,
      kind,
      JSON.stringify(payload),
      version,
    ]),
  );
before(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`,
  );
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/20261029060302_somssi_operations.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  for (const user of [owner, editor, viewer, outsider])
    await db.query("insert into auth.users values($1)", [user]);
  await db.query(
    "insert into public.somssi_projects(id,name) values($1,$2),($3,$4)",
    [project, "test", otherProject, "other"],
  );
  for (const [user, role] of [
    [owner, "owner"],
    [editor, "editor"],
    [viewer, "viewer"],
  ])
    await db.query(
      "insert into public.somssi_project_members(project_id,user_id,role) values($1,$2,$3)",
      [project, user, role],
    );
});
after(async () => {
  await db?.close();
});
test("migration applies; database rules match every application domain", async () => {
  const rules = (
    await db.query("select kind,fields from somssi_private.kind_rules")
  ).rows;
  assert.equal(rules.length, Object.keys(domains).length);
  for (const rule of rules) assert.deepEqual(rule.fields, fieldsFor(rule.kind));
});
test("server validation catches invalid dates, missing fields and plans reported as actual", () => {
  assert.throws(() =>
    validatePayload("tasks", defaults("tasks", { dueAt: "bad" })),
  );
  assert.throws(() =>
    validatePayload(
      "milestones",
      defaults("milestones", { start: "2026-02-30" }),
    ),
  );
  assert.throws(() =>
    validatePayload(
      "tasks",
      defaults("tasks", { status: "done", completedAt: null }),
    ),
  );
  assert.throws(() =>
    validatePayload(
      "pilots",
      defaults("pilots", { scenarioId: randomUUID(), attended: 4 }),
    ),
  );
  assert.throws(() =>
    validatePayload("partners", defaults("partners", { stage: "계약" })),
  );
});
test("nonmembers see no records; viewers cannot write; direct mutation and role escalation denied", async () => {
  await write(owner, "products", defaults("products"));
  const rows = await acting(outsider, (tx) =>
    tx.query("select * from public.somssi_records"),
  );
  assert.equal(rows.rows.length, 0);
  await assert.rejects(
    write(viewer, "products", defaults("products")),
    /FORBIDDEN/,
  );
  await assert.rejects(
    write(outsider, "products", defaults("products")),
    /FORBIDDEN/,
  );
  await assert.rejects(
    acting(editor, (tx) =>
      tx.exec("update public.somssi_project_members set role='owner'"),
    ),
    /permission denied/,
  );
  await assert.rejects(
    acting(owner, (tx) => tx.exec("delete from public.somssi_records")),
    /permission denied/,
  );
  await assert.rejects(
    acting(owner, (tx) => tx.exec("delete from public.somssi_audit_logs")),
    /permission denied/,
  );
});
test("changes and audit commit together, immutable records survive, stale versions fail", async () => {
  const id = randomUUID();
  const payload = defaults("tasks");
  await write(editor, "tasks", payload, id);
  await write(editor, "tasks", { ...payload, title: "updated" }, id, 1);
  await assert.rejects(
    write(editor, "tasks", { ...payload, title: "stale" }, id, 1),
    /VERSION_CONFLICT/,
  );
  const record = (
    await db.query(
      "select version,payload from public.somssi_records where id=$1",
      [id],
    )
  ).rows[0];
  assert.equal(record.version, 2);
  assert.equal(record.payload.title, "updated");
  const audit = (
    await db.query(
      "select * from public.somssi_audit_logs where entity_id=$1 order by id",
      [id],
    )
  ).rows;
  assert.equal(audit.length, 2);
  assert.equal(audit[1].before_value.payload.title, "test");
  assert.equal(audit[1].actor_id, editor);
});
test("cross-project and wrong-kind references are rejected atomically", async () => {
  const product = randomUUID();
  await write(owner, "products", defaults("products"), product);
  const s = defaults("scenarios", { productId: product, minutes: 60 });
  await assert.rejects(
    write(owner, "scenarios", { ...s, productId: randomUUID() }),
    /INVALID_REFERENCE/,
  );
  await assert.rejects(
    write(owner, "scenarios", s, randomUUID(), 0, otherProject),
    /FORBIDDEN/,
  );
  const id = randomUUID();
  await assert.rejects(
    write(owner, "tasks", defaults("tasks", { ownerId: product }), id),
    /INVALID_REFERENCE/,
  );
  assert.equal(
    (
      await db.query(
        "select * from public.somssi_audit_logs where entity_id=$1",
        [id],
      )
    ).rows.length,
    0,
  );
});
test("expense correction cannot delete, edit, change funds or over-reverse; reviews need admin to settle", async () => {
  const id = randomUUID();
  const payload = defaults("expenses", {
    fund: "1r",
    vendor: "test vendor",
    category: "test category",
    amountWon: 50000,
  });
  await write(editor, "expenses", payload, id);
  await assert.rejects(
    write(editor, "expenses", { ...payload, amountWon: 0 }, id, 1),
    /IMMUTABLE_RECORD/,
  );
  await write(editor, "expenses", {
    ...payload,
    amountWon: -10000,
    correctionOfId: id,
    correctionReason: "correction",
  });
  await assert.rejects(
    write(editor, "expenses", {
      ...payload,
      amountWon: -50000,
      correctionOfId: id,
      correctionReason: "excess",
    }),
    /CORRECTION_EXCEEDS_ORIGINAL/,
  );
  await assert.rejects(
    write(editor, "expenses", {
      ...payload,
      fund: "future",
      amountWon: -10000,
      correctionOfId: id,
      correctionReason: "wrong fund",
    }),
    /CORRECTION_ORIGINAL_MISMATCH/,
  );
  const sum = (
    await db.query(
      "select sum((payload->>'amountWon')::int)::int as amount from public.somssi_records where kind='expenses' and project_id=$1",
      [project],
    )
  ).rows[0].amount;
  assert.equal(sum, 40000);
  await assert.rejects(
    write(
      editor,
      "expenseReviews",
      defaults("expenseReviews", {
        expenseId: id,
        settlement: "settled",
        notes: "review",
      }),
    ),
    /SETTLEMENT_REQUIRES_ADMIN/,
  );
  await write(
    owner,
    "expenseReviews",
    defaults("expenseReviews", {
      expenseId: id,
      settlement: "settled",
      notes: "review",
    }),
  );
});
test("malformed direct RPC input cannot bypass app validation", async () => {
  await assert.rejects(
    write(
      owner,
      "tasks",
      defaults("tasks", { status: "done", completedAt: null }),
    ),
    /COMPLETION_DATE_REQUIRED/,
  );
  await assert.rejects(
    write(owner, "products", { ...defaults("products"), admin: true }),
    /UNKNOWN_FIELD/,
  );
  await assert.rejects(
    write(owner, "allocations", defaults("allocations", { amountWon: 1.5 })),
    /INTEGER_REQUIRED/,
  );
  await assert.rejects(write(owner, "products", {}), /MISSING_FIELD/);
});
test("backup contains records and audit from one snapshot; viewer export denied", async () => {
  const result = await acting(owner, (tx) =>
    tx.query("select public.somssi_export_backup($1) as backup", [project]),
  );
  const backup = result.rows[0].backup;
  assert.equal(backup.format, "somssi-backup-v1");
  assert.ok(backup.records.length > 0);
  assert.ok(backup.audit.length >= backup.records.length);
  for (const record of backup.records)
    assert.ok(backup.audit.some((a) => a.entity_id === record.id));
  await assert.rejects(
    acting(viewer, (tx) =>
      tx.query("select public.somssi_export_backup($1)", [project]),
    ),
    /FORBIDDEN/,
  );
});
test("an actor belonging to two projects still cannot cross-reference their records", async () => {
  await db.query(
    "insert into public.somssi_project_members(project_id,user_id,role) values($1,$2,'owner')",
    [otherProject, owner],
  );
  const product = randomUUID();
  await write(owner, "products", defaults("products"), product);
  await assert.rejects(
    write(
      owner,
      "scenarios",
      defaults("scenarios", { productId: product, minutes: 60 }),
      randomUUID(),
      0,
      otherProject,
    ),
    /INVALID_REFERENCE/,
  );
});
test("LOI evidence cannot be counted as a contract", async () => {
  async function evidence(evidenceType) {
    const id = randomUUID();
    await write(
      owner,
      "evidence",
      defaults("evidence", {
        evidenceType,
        storagePath: `${project}/${owner}/${id}.pdf`,
        originalName: "fixture.pdf",
        sha256: "a".repeat(64),
        size: 1,
        contentType: "application/octet-stream",
      }),
      id,
    );
    return id;
  }
  const loi = await evidence("협력의향서(LOI)");
  await write(
    owner,
    "partners",
    defaults("partners", { stage: "협력의향", loiEvidenceId: loi }),
  );
  await assert.rejects(
    write(
      owner,
      "partners",
      defaults("partners", { stage: "계약", contractEvidenceId: loi }),
    ),
    /CONTRACT_EVIDENCE_TYPE_REQUIRED/,
  );
  const contract = await evidence("계약서");
  await write(
    owner,
    "partners",
    defaults("partners", { stage: "계약", contractEvidenceId: contract }),
  );
});
