import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { fieldsFor } from "../apps/web/lib/operations/domains.ts";
test("record and audit survive a PostgreSQL engine close and reopen", async () => {
  const dir = await mkdtemp(join(tmpdir(), "somssi-persistence-"));
  let db;
  const project = randomUUID(),
    actor = randomUUID(),
    id = randomUUID();
  try {
    db = new PGlite(dir);
    await db.exec(
      `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;`,
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
    await db.query("insert into auth.users values($1)", [actor]);
    await db.query(
      "insert into public.somssi_projects(id,name) values($1,$2)",
      [project, "persistence test"],
    );
    await db.query(
      "insert into public.somssi_project_members values($1,$2,'owner',true)",
      [project, actor],
    );
    const payload = Object.fromEntries(
      fieldsFor("products").map((f) => [
        f.key,
        f.type === "refs"
          ? []
          : f.type === "select"
            ? f.options[0]
            : f.key === "title"
              ? "persisted"
              : f.key === "source"
                ? "test"
                : null,
      ]),
    );
    await db.transaction(async (tx) => {
      await tx.exec("set local role authenticated");
      await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [
        actor,
      ]);
      await tx.query("select public.somssi_write_record($1,$2,$3,$4,0)", [
        project,
        id,
        "products",
        JSON.stringify(payload),
      ]);
    });
    await db.close();
    db = new PGlite(dir);
    assert.equal(
      (
        await db.query(
          "select payload from public.somssi_records where id=$1",
          [id],
        )
      ).rows[0].payload.title,
      "persisted",
    );
    assert.equal(
      (
        await db.query(
          "select * from public.somssi_audit_logs where entity_id=$1",
          [id],
        )
      ).rows.length,
      1,
    );
  } finally {
    await db?.close();
    await rm(dir, { recursive: true, force: true });
  }
});
