import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { LocalStore } from "../apps/web/lib/local/store.ts";
import { localValues } from "./support/local-records.mjs";
import { validatePayload } from "../apps/web/lib/operations/validation.ts";
import {
  validateDraftSelection,
  downloadDocument,
  documentStatus,
} from "../apps/web/lib/documents/service.ts";
const hash = (b) => createHash("sha256").update(b).digest("hex");
test("document input preserves missing facts and validates optional times without invented values", () => {
  const p = localValues("documentDrafts", { title: "fixture draft" });
  assert.equal(p.startTime, null);
  assert.equal(p.attendees, null);
  assert.equal(p.photoIds.length, 0);
  assert.equal(p.receiptStatus, "확인 필요");
  assert.doesNotThrow(() => validatePayload("documentDrafts", p));
  for (const change of [
    { startTime: "14:00" },
    { startTime: "24:00", endTime: "25:00" },
    { startTime: "14:00", endTime: "13:59" },
  ])
    assert.throws(() => validatePayload("documentDrafts", { ...p, ...change }));
});
test("selection rejects wrong kinds, archived drafts, duplicate IDs, mixed funds and unsupported activity rows", () => {
  const d = {
    id: randomUUID(),
    kind: "documentDrafts",
    payload: localValues("documentDrafts", { template: "meeting" }),
  };
  assert.equal(validateDraftSelection([d], [d.id]).length, 1);
  assert.throws(() => validateDraftSelection([d], [d.id, d.id]));
  assert.throws(() => validateDraftSelection([d], [randomUUID()]));
  assert.throws(() =>
    validateDraftSelection([{ ...d, kind: "products" }], [d.id]),
  );
  assert.throws(() =>
    validateDraftSelection(
      [{ ...d, payload: { ...d.payload, state: "보관" } }],
      [d.id],
    ),
  );
  const e = {
    id: randomUUID(),
    kind: "expenses",
    payload: localValues("expenses", { fund: "ai", amountWon: 50000 }),
  };
  assert.throws(() =>
    validateDraftSelection(
      [e, { ...d, payload: { ...d.payload, expenseIds: [e.id] } }],
      [d.id],
    ),
  );
  assert.throws(() =>
    validateDraftSelection(
      [{ ...d, payload: { ...d.payload, template: "activity" } }],
      [d.id],
    ),
  );
  const meal = {
    ...e,
    payload: { ...e.payload, fund: "1r", category: "회의비" },
  };
  assert.throws(() =>
    validateDraftSelection(
      [
        meal,
        {
          ...d,
          payload: {
            ...d.payload,
            template: "activity",
            expenseIds: [meal.id],
          },
        },
      ],
      [d.id],
    ),
  );
  const expenses = Array.from({ length: 22 }, () => ({
    ...e,
    id: randomUUID(),
    payload: { ...e.payload, fund: "1r" },
  }));
  assert.throws(() =>
    validateDraftSelection(
      [
        ...expenses,
        {
          ...d,
          payload: {
            ...d.payload,
            template: "details",
            expenseIds: expenses.map((e) => e.id),
          },
        },
      ],
      [d.id],
    ),
  );
});
test("download is bound to immutable generation audit, whitelist, manifest and file hashes", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "somssi-documents-test-"));
  const store = new LocalStore(dir);
  try {
    assert.equal((await documentStatus(store)).ready, false);
    const draft = store.write(
      "documentDrafts",
      randomUUID(),
      localValues("documentDrafts"),
      0,
    );
    const id = randomUUID();
    const folder = path.join(dir, "documents/jobs", id);
    await mkdir(folder, { recursive: true, mode: 0o700 });
    const bytes = Buffer.from("LOCAL TEST FIXTURE");
    await writeFile(path.join(folder, "fixture.docx"), bytes);
    const manifest = {
      status: "검토 필요",
      structurePreserved: true,
      rendered: true,
      layoutTextChecked: true,
      warnings: ["fixture"],
      files: [
        {
          filename: "fixture.docx",
          title: "fixture",
          sha256: hash(bytes),
          size: bytes.length,
          pages: 1,
          warnings: [],
        },
      ],
    };
    const json = JSON.stringify(manifest);
    await writeFile(path.join(folder, "manifest.json"), json);
    const rec = store.write(
      "documentGenerations",
      randomUUID(),
      localValues("documentGenerations", {
        jobId: id,
        draftIds: [draft.id],
        snapshotHash: "a".repeat(64),
        manifestHash: hash(json),
        checks: "fixture only",
      }),
      0,
    );
    assert.deepEqual(
      (await downloadDocument(store, id, "fixture.docx")).content,
      bytes,
    );
    assert.throws(
      () => store.write("documentGenerations", rec.id, rec.payload, 1),
      (e) => e.status === 403,
    );
    await assert.rejects(
      downloadDocument(store, id, "../fixture.docx"),
      (e) => e.status === 404,
    );
    await assert.rejects(
      downloadDocument(store, randomUUID(), "fixture.docx"),
      (e) => e.status === 404,
    );
    await writeFile(path.join(folder, "fixture.docx"), "changed");
    await assert.rejects(
      downloadDocument(store, id, "fixture.docx"),
      (e) => e.status === 409,
    );
    await writeFile(path.join(folder, "manifest.json"), "{}");
    await assert.rejects(
      downloadDocument(store, id, "fixture.docx"),
      (e) => e.status === 409,
    );
    assert.equal(store.audits().length, 2);
  } finally {
    store.close();
    await rm(dir, { recursive: true, force: true });
  }
});
