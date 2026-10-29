import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  mkdtemp,
  rm,
  stat,
  mkdir,
  writeFile,
  readFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { LocalStore } from "../apps/web/lib/local/store.ts";
import { localValues } from "./support/local-records.mjs";
import { localRequestError } from "../apps/web/lib/local/access.ts";
import { summarize } from "../apps/web/lib/v2/metrics.ts";
import { toOperatingData } from "../apps/web/lib/operations/projection.ts";
async function withStore(fn) {
  const dir = await mkdtemp(path.join(tmpdir(), "somssi-local-test-"));
  const store = new LocalStore(dir);
  try {
    await fn(store, dir);
  } finally {
    if (store.db.isOpen) store.close();
    await rm(dir, { recursive: true, force: true });
  }
}
const save = (s, kind, values = {}, id = randomUUID(), version = 0) =>
  s.write(kind, id, localValues(kind, values), version);
test("local SQLite bootstraps empty without credentials, private file permissions and stable IDs", () =>
  withStore(async (s, dir) => {
    assert.equal(s.list().length, 0);
    assert.equal(s.audits().length, 0);
    assert.equal(s.project.budget_won, 2000000);
    assert.equal((await stat(dir)).mode & 0o777, 0o700);
    assert.equal(
      (await stat(path.join(dir, "store.sqlite"))).mode & 0o777,
      0o600,
    );
    const id = s.project.id,
      actor = s.userId;
    const row = save(s, "products", { title: "persisted" });
    s.close();
    const again = new LocalStore(dir);
    try {
      assert.equal(again.project.id, id);
      assert.equal(again.userId, actor);
      assert.equal(again.get(row.id).payload.title, "persisted");
      assert.equal(again.audits().length, 1);
    } finally {
      again.close();
    }
  }));
test("record update and audit are atomic; stale versions and failed references leave history unchanged", () =>
  withStore((s) => {
    const row = save(s, "tasks", { title: "first" });
    save(s, "tasks", { title: "second" }, row.id, 1);
    assert.equal(s.get(row.id).version, 2);
    assert.equal(s.audits()[1].before_value.payload.title, "first");
    assert.throws(
      () => save(s, "tasks", { title: "stale" }, row.id, 1),
      (e) => e.status === 409,
    );
    assert.equal(s.audits().length, 2);
    assert.throws(
      () => save(s, "tasks", { ownerId: randomUUID() }),
      (e) => e.status === 422,
    );
    assert.throws(
      () => save(s, "tasks", { ownerId: row.id }),
      (e) => e.status === 422,
    );
    assert.equal(s.list().length, 1);
    assert.equal(s.audits().length, 2);
  }));
test("SQLite enforces immutable expenses/audit and correction totals with funds separated", () =>
  withStore((s) => {
    const original = save(s, "expenses", {
      vendor: "vendor",
      category: "category",
      amountWon: 50000,
    });
    save(s, "allocations", {
      fund: "1r",
      category: "category",
      amountWon: 200000,
      confirmed: true,
    });
    assert.throws(
      () =>
        save(
          s,
          "expenses",
          { vendor: "vendor", category: "category", amountWon: 40000 },
          original.id,
          1,
        ),
      (e) => e.status === 403,
    );
    save(s, "expenses", {
      vendor: "vendor",
      category: "category",
      amountWon: -10000,
      correctionOfId: original.id,
      correctionReason: "amount correction",
    });
    assert.throws(
      () =>
        save(s, "expenses", {
          vendor: "vendor",
          category: "category",
          amountWon: -50000,
          correctionOfId: original.id,
          correctionReason: "over reverse",
        }),
      (e) => e.status === 422,
    );
    assert.throws(
      () =>
        save(s, "expenses", {
          fund: "future",
          vendor: "vendor",
          category: "category",
          amountWon: -10000,
          correctionOfId: original.id,
          correctionReason: "wrong fund",
        }),
      (e) => e.status === 422,
    );
    assert.throws(
      () => s.db.prepare("delete from records where id=?").run(original.id),
      /RECORD_DELETE_FORBIDDEN/,
    );
    assert.throws(
      () =>
        s.db
          .prepare("update records set version=99 where id=?")
          .run(original.id),
      /IMMUTABLE_RECORD/,
    );
    assert.throws(() => s.db.exec("delete from audit_logs"), /AUDIT_IMMUTABLE/);
    const summary = summarize(
      toOperatingData(s.list()),
      s.project.id,
      new Date(),
    );
    assert.equal(summary.spentWon, 40000);
    assert.equal(summary.allocatedWon, 200000);
    assert.equal(summary.remainingWon, 1960000);
    const count = s.audits().length;
    assert.throws(
      () =>
        save(s, "allocations", {
          fund: "1r",
          category: "category",
          amountWon: 1,
        }),
      (e) => e.status === 409,
    );
    assert.equal(s.audits().length, count);
  }));
test("local store rejects malformed plans and paid payment edits; anonymous participants stay linked", () =>
  withStore((s) => {
    const product = save(s, "products");
    const scenario = save(s, "scenarios", {
      productId: product.id,
      minutes: 60,
    });
    assert.throws(
      () =>
        save(s, "pilots", {
          scenarioId: scenario.id,
          status: "planned",
          attended: 4,
        }),
      /계획/,
    );
    const pilot = save(s, "pilots", {
      scenarioId: scenario.id,
      status: "conducted",
      attended: 4,
      applied: 4,
      satisfactionResponses: 4,
      satisfactionTotal: 18,
      successful: 3,
    });
    const participant = save(s, "participants", {
      pilotId: pilot.id,
      title: "P001",
    });
    const payment = save(s, "payments", {
      pilotId: pilot.id,
      participantId: participant.id,
      status: "paid",
      amountWon: 50000,
      paidAt: "2026-11-01",
    });
    assert.throws(
      () =>
        save(
          s,
          "payments",
          {
            pilotId: pilot.id,
            participantId: participant.id,
            status: "paid",
            amountWon: 60000,
            paidAt: "2026-11-01",
          },
          payment.id,
          1,
        ),
      (e) => e.status === 403,
    );
    const other = save(s, "pilots", { scenarioId: scenario.id });
    assert.throws(
      () => save(s, "participants", { pilotId: other.id }, participant.id, 1),
      (e) => e.status === 422,
    );
    assert.equal(
      summarize(toOperatingData(s.list()), s.project.id, new Date()).revenueWon,
      50000,
    );
  }));
test("LOI remains separate from contract and evidence paths cannot traverse local folders", () =>
  withStore((s) => {
    const id = randomUUID();
    const p = {
      evidenceType: "협력의향서(LOI)",
      storagePath: `${s.project.id}/${s.userId}/${id}.pdf`,
      originalName: "test.pdf",
      sha256: "a".repeat(64),
      size: 1,
      contentType: "application/octet-stream",
    };
    save(s, "evidence", p, id);
    assert.throws(
      () => save(s, "partners", { stage: "계약", contractEvidenceId: id }),
      (e) => e.status === 422,
    );
    save(s, "partners", { stage: "협력의향", loiEvidenceId: id });
    assert.throws(
      () => save(s, "evidence", { ...p, storagePath: "../../file.pdf" }),
      (e) => e.status === 422,
    );
  }));
test("only loopback host and same-origin mutations are accepted; GET rebinding and cross-site are denied", () => {
  const request = (host = "127.0.0.1:3100", method = "GET", extra = {}) =>
    new Request("http://localhost:3100/api/workspace", {
      method,
      headers: { host, ...extra },
    });
  assert.equal(localRequestError(request()), null);
  assert.equal(
    localRequestError(
      request("localhost:3100", "POST", { Origin: "http://localhost:3100" }),
    ),
    null,
  );
  assert.ok(localRequestError(request("evil.example")));
  assert.ok(
    localRequestError(
      request("127.0.0.1:3100", "GET", { Origin: "https://evil.example" }),
    ),
  );
  assert.ok(
    localRequestError(
      request("127.0.0.1:3100", "GET", { "sec-fetch-site": "cross-site" }),
    ),
  );
  assert.ok(localRequestError(request("127.0.0.1:3100", "POST")));
  assert.ok(
    localRequestError(
      request("127.0.0.1:3100", "POST", { Origin: "http://127.0.0.1:3101" }),
    ),
  );
});
test("simultaneous local store connections use the same persistent state and reject stale writes", () =>
  withStore((s, dir) => {
    const other = new LocalStore(dir);
    try {
      const row = save(s, "products", { title: "one" });
      save(other, "products", { title: "two" }, row.id, 1);
      assert.equal(s.get(row.id).payload.title, "two");
      assert.throws(
        () => save(s, "products", { title: "stale" }, row.id, 1),
        (e) => e.status === 409,
      );
      assert.equal(s.audits().length, 2);
    } finally {
      other.close();
    }
  }));
