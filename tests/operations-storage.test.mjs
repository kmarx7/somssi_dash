import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
test("private storage policies isolate projects and owners; viewer cannot access sensitive objects", async () => {
  const db = new PGlite();
  const project = randomUUID(),
    other = randomUUID(),
    owner = randomUUID(),
    editor = randomUUID(),
    viewer = randomUUID(),
    outsider = randomUUID();
  try {
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
    await db.exec(
      `create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert on storage.objects to authenticated;create function storage.foldername(name text) returns text[] language sql immutable as $$select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1]$$;`,
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/20261029061119_somssi_private_evidence.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    for (const user of [owner, editor, viewer, outsider])
      await db.query("insert into auth.users values($1)", [user]);
    await db.query(
      "insert into public.somssi_projects(id,name) values($1,$2),($3,$4)",
      [project, "storage test", other, "other"],
    );
    for (const [id, role] of [
      [owner, "owner"],
      [editor, "editor"],
      [viewer, "viewer"],
    ])
      await db.query(
        "insert into public.somssi_project_members(project_id,user_id,role) values($1,$2,$3)",
        [project, id, role],
      );
    const acting = (user, fn) =>
      db.transaction(async (tx) => {
        await tx.exec("set local role authenticated");
        await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [
          user,
        ]);
        return fn(tx);
      });
    const insert = (user, path) =>
      acting(user, (tx) =>
        tx.query(
          "insert into storage.objects(bucket_id,name) values('somssi-evidence',$1)",
          [path],
        ),
      );
    const path = `${project}/${editor}/${randomUUID()}.pdf`;
    await insert(editor, path);
    await assert.rejects(
      insert(editor, `${project}/${owner}/file.pdf`),
      /row-level security/,
    );
    await assert.rejects(
      insert(editor, `${other}/${editor}/file.pdf`),
      /row-level security/,
    );
    await assert.rejects(
      insert(viewer, `${project}/${viewer}/file.pdf`),
      /row-level security/,
    );
    for (const user of [viewer, outsider])
      assert.equal(
        (await acting(user, (tx) => tx.query("select * from storage.objects")))
          .rows.length,
        0,
      );
    for (const user of [owner, editor])
      assert.equal(
        (await acting(user, (tx) => tx.query("select * from storage.objects")))
          .rows.length,
        1,
      );
    assert.equal(
      (await db.query("select public from storage.buckets")).rows[0].public,
      false,
    );
  } finally {
    await db.close();
  }
});
