import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import {
  mkdtemp,
  rm,
  mkdir,
  writeFile,
  readFile,
  access,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { LocalStore } from "../apps/web/lib/local/store.ts";
import {
  createLocalArchive,
  restoreLocalArchive,
} from "../apps/web/lib/local/archive.ts";
import { localValues } from "./support/local-records.mjs";
test("complete local backup restores DB, immutable audit and evidence bytes into a new folder", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "somssi-backup-test-"));
  const s = new LocalStore(path.join(root, "live"));
  let archive;
  try {
    const product = s.write(
      "products",
      randomUUID(),
      localValues("products", { title: "preserved" }),
      0,
    );
    const id = randomUUID();
    const bytes = Buffer.from("%PDF-1.4\nlocal evidence fixture\n");
    const payload = localValues("evidence", {
      title: "local evidence",
      evidenceType: "영수증",
      storagePath: `${s.project.id}/${s.userId}/${id}.pdf`,
      originalName: "fixture.pdf",
      sha256: createHash("sha256").update(bytes).digest("hex"),
      size: bytes.length,
      contentType: "application/octet-stream",
    });
    const file = path.join(s.directory, "evidence", payload.storagePath);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, bytes);
    s.write("evidence", id, payload, 0);
    archive = await createLocalArchive(s);
    const restored = await restoreLocalArchive(
      archive.filename,
      path.join(root, "restored"),
    );
    const next = new LocalStore(restored);
    try {
      assert.equal(next.get(product.id).payload.title, "preserved");
      assert.deepEqual(next.audits(), s.audits());
      assert.deepEqual(await readFile(next.evidencePath(next.get(id))), bytes);
      next.write(
        "products",
        randomUUID(),
        localValues("products", { title: "new after restore" }),
        0,
      );
      assert.equal(next.list().length, 3);
      assert.equal(s.list().length, 2);
    } finally {
      next.close();
    }
    await assert.rejects(
      restoreLocalArchive(archive.filename, s.directory),
      /EEXIST/,
    );
    assert.equal(s.list().length, 2);
    const text = gunzipSync(await readFile(archive.filename)).toString();
    const lines = text.trim().split("\n");
    const manifest = JSON.parse(lines[0]);
    manifest.files[0].sha256 = "0".repeat(64);
    lines[0] = JSON.stringify(manifest);
    const bad = path.join(root, "bad.gz");
    await writeFile(bad, gzipSync(lines.join("\n") + "\n"));
    const target = path.join(root, "bad-target");
    await assert.rejects(restoreLocalArchive(bad, target), /해시/);
    await assert.rejects(access(target));
    assert.equal(s.list().length, 2);
  } finally {
    s.close();
    await archive?.cleanup();
    await rm(root, { recursive: true, force: true });
  }
});
test("backup refuses evidence that was changed outside the app", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "somssi-backup-hash-"));
  const s = new LocalStore(root);
  try {
    const id = randomUUID();
    const p = localValues("evidence", {
      storagePath: `${s.project.id}/${s.userId}/${id}.pdf`,
      originalName: "fixture.pdf",
      evidenceType: "영수증",
      sha256: "a".repeat(64),
      size: 1,
      contentType: "application/octet-stream",
    });
    const file = path.join(root, "evidence", p.storagePath);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, "x");
    s.write("evidence", id, p, 0);
    await assert.rejects(createLocalArchive(s), /해시/);
  } finally {
    s.close();
    await rm(root, { recursive: true, force: true });
  }
});
test("invalid gzip fails without touching an existing operating directory", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "somssi-invalid-backup-"));
  try {
    const bad = path.join(root, "invalid.gz");
    await writeFile(bad, "not a gzip archive");
    const target = path.join(root, "new-target");
    await assert.rejects(restoreLocalArchive(bad, target));
    await assert.rejects(access(target));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("pre-follow-up document drafts restore without adding fields or changing audit payloads", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "somssi-legacy-doc-backup-"));
  const store = new LocalStore(path.join(root, "live"));
  let archive;
  try {
    const payload = localValues("documentDrafts", {
      template: "meeting",
      date: "2026-10-23",
    });
    delete payload.meetingNumber;
    delete payload.previousDraftId;
    delete payload.previousReview;
    const rec = store.write("documentDrafts", randomUUID(), payload, 0);
    assert.deepEqual(rec.payload, payload);
    archive = await createLocalArchive(store);
    const folder = await restoreLocalArchive(
      archive.filename,
      path.join(root, "restored"),
    );
    const restored = new LocalStore(folder);
    try {
      assert.deepEqual(restored.get(rec.id).payload, payload);
      assert.deepEqual(restored.audits(), store.audits());
    } finally {
      restored.close();
    }
  } finally {
    store.close();
    await archive?.cleanup();
    await rm(root, { recursive: true, force: true });
  }
});
