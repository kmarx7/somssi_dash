import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { makeCsv } from "../apps/web/lib/operations/csv.ts";
import {
  toOperatingData,
  pilotResults,
} from "../apps/web/lib/operations/projection.ts";
const row = (kind, payload, updated_at = "2026-11-01T00:00:00Z") => ({
  id: randomUUID(),
  project_id: "p",
  kind,
  payload: {
    source: "test",
    checkedAt: null,
    verificationStatus: "확인 필요",
    evidenceIds: [],
    ...payload,
  },
  updated_at,
  created_at: updated_at,
  version: 1,
  created_by: "actor",
});
test("review overlays never mutate immutable ledger and latest review supplies receipt state", () => {
  const expense = row("expenses", {
    amountWon: 50000,
    fund: "1r",
    correctionOfId: null,
    receipt: false,
    settlement: "unreviewed",
  });
  const old = row("expenseReviews", {
    expenseId: expense.id,
    receipt: false,
    settlement: "pending_documents",
  });
  const latest = row(
    "expenseReviews",
    { expenseId: expense.id, receipt: true, settlement: "settled" },
    "2026-11-02T00:00:00Z",
  );
  const projection = toOperatingData([expense, latest, old]);
  assert.equal(projection.expenses[0].receipt, true);
  assert.equal(projection.expenses[0].settlement, "settled");
  assert.equal(expense.payload.receipt, false);
});
test("survey nonresponses remain null and actual margins use payment/expense amounts", () => {
  const pilot = row("pilots", {
    status: "conducted",
    attended: 4,
    successful: 3,
    satisfactionTotal: 18,
    satisfactionResponses: 4,
  });
  const records = [
    pilot,
    row("payments", { pilotId: pilot.id, status: "paid", amountWon: 50000 }),
    row("expenses", { pilotId: pilot.id, amountWon: 10000 }),
    row("surveys", {
      purchaseIntent: "미응답",
      preference: "미응답",
      visitIncheon: "예",
    }),
  ];
  const data = toOperatingData(records);
  assert.equal(data.surveys[0].purchaseIntent, null);
  assert.equal(data.surveys[0].visitIncheon, true);
  const result = pilotResults(records)[0];
  assert.equal(result.contribution, 40000);
  assert.equal(result.achievement, 75);
  assert.equal(result.satisfaction, 4.5);
});
test("CSV escapes quotes, line breaks and spreadsheet formulas", () => {
  const csv = makeCsv([['=HYPERLINK("bad")', "a\nb", -100, "-formula"]]);
  assert.ok(csv.startsWith("\ufeff"));
  assert.ok(csv.includes("'="));
  assert.ok(csv.includes('"-100"'));
  assert.ok(csv.includes("'-formula"));
  assert.ok(csv.includes('"a\nb"'));
});
test("unreviewed correction invalidates settlement total until every posting is reviewed", () => {
  const original = row("expenses", {
    amountWon: 50000,
    fund: "1r",
    correctionOfId: null,
    receipt: true,
    settlement: "unreviewed",
  });
  const correction = row("expenses", {
    amountWon: -10000,
    fund: "1r",
    correctionOfId: original.id,
    receipt: true,
    settlement: "unreviewed",
  });
  const reviewedOriginal = row("expenseReviews", {
    expenseId: original.id,
    receipt: true,
    settlement: "settled",
  });
  const records = [original, correction, reviewedOriginal];
  assert.ok(
    toOperatingData(records).expenses.every((e) => e.settlement !== "settled"),
  );
  const reviewedCorrection = row("expenseReviews", {
    expenseId: correction.id,
    receipt: true,
    settlement: "settled",
  });
  assert.equal(
    toOperatingData([...records, reviewedCorrection])
      .expenses.filter((e) => e.settlement === "settled")
      .reduce((n, e) => n + e.amountWon, 0),
    40000,
  );
});
