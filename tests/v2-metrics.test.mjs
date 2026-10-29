import assert from "node:assert/strict";
import { test } from "node:test";
import {
  summarize,
  deadlineRemaining,
  scenarioMargin,
} from "../apps/web/lib/v2/metrics.ts";
import { operatingData } from "../apps/web/data/reference/operating-data.ts";
import { v2Reference } from "../apps/web/data/reference/v2.ts";
const now = new Date("2026-11-01T00:00:00+09:00");
const base = {
  projectId: "p",
  provenance: { source: "test fixture", checkedAt: null, status: "확인 필요" },
  evidenceIds: [],
};
const summarizeRows = (rows) =>
  summarize({ ...operatingData, ...rows }, "p", now);
test("empty disconnected records never import demo achievements", () => {
  const s = summarizeRows({});
  for (const key of [
    "spentWon",
    "allocatedWon",
    "revenueWon",
    "paymentCount",
    "participants",
    "pilots",
    "interviews",
    "validatedDocuments",
  ])
    assert.equal(s[key], 0);
  assert.equal(s.progress, null);
});
test("allocation, actual spending, other funds and correction postings stay separate", () => {
  const s = summarizeRows({
    allocations: [
      { ...base, id: "a", fund: "1r", confirmed: true, amountWon: 500_000 },
      {
        ...base,
        id: "b",
        fund: "future",
        confirmed: true,
        amountWon: 30_000_000,
      },
    ],
    expenses: [
      {
        ...base,
        id: "e",
        fund: "1r",
        amountWon: 50_000,
        correctionOfId: null,
        receipt: false,
        settlement: "pending_documents",
      },
      {
        ...base,
        id: "c",
        fund: "1r",
        amountWon: -10_000,
        correctionOfId: "e",
        receipt: true,
        settlement: "unreviewed",
      },
      { ...base, id: "ai", fund: "ai", amountWon: 100_000, receipt: true },
      { ...base, projectId: "other", id: "x", fund: "1r", amountWon: 999_999 },
    ],
  });
  assert.equal(s.allocatedWon, 500_000);
  assert.equal(s.spentWon, 40_000);
  assert.equal(s.remainingWon, 1_960_000);
  assert.deepEqual(s.missingReceipts, ["e"]);
  assert.equal(s.settledWon, 0);
});
test("conducted pilots, interviews, surveys and actual prepayments stay distinct", () => {
  const s = summarizeRows({
    pilots: [
      { ...base, id: "ran", status: "conducted", attended: 4 },
      { ...base, id: "plan", status: "planned", attended: 20 },
    ],
    surveys: [
      {
        ...base,
        id: "s",
        completed: true,
        kind: "survey",
        respondentId: "r",
        purchaseIntent: true,
        reservationInquiry: true,
      },
    ],
    payments: [
      {
        ...base,
        id: "paid",
        pilotId: "ran",
        participantId: "r",
        status: "paid",
        amountWon: 50_000,
      },
      {
        ...base,
        id: "pending",
        pilotId: "ran",
        participantId: "b",
        status: "pending",
        amountWon: 50_000,
      },
      {
        ...base,
        id: "orphan",
        pilotId: "plan",
        participantId: "c",
        status: "paid",
        amountWon: 90_000,
      },
    ],
  });
  assert.equal(s.pilots, 1);
  assert.equal(s.participants, 4);
  assert.equal(s.paymentCount, 2);
  assert.equal(s.revenueWon, 140_000);
  assert.equal(s.interviews, 0);
  assert.equal(s.purchaseIntent, 1);
  assert.equal(s.reservationInquiries, 1);
});
test("LOI, contact and signed contract evidence are distinct", () => {
  const s = summarizeRows({
    partners: [
      { ...base, id: "a", stage: "접촉", contractEvidenceId: null },
      {
        ...base,
        id: "b",
        stage: "협력의향",
        loiEvidenceId: "loi",
        contractEvidenceId: null,
      },
      { ...base, id: "c", stage: "계약", contractEvidenceId: "contract" },
      { ...base, id: "d", stage: "계약", contractEvidenceId: null },
    ],
  });
  assert.equal(s.partnerContact, 1);
  assert.equal(s.partnerNegotiation, 1);
  assert.equal(s.partnerContract, 1);
});
test("money and headcount changes recalculate margin; missing price does not become zero", () => {
  const scenario = {
    priceWon: 50_000,
    fixedCostWon: 40_000,
    variableCostWon: 10_000,
  };
  assert.deepEqual(scenarioMargin(scenario, 4), {
    revenueWon: 200_000,
    costWon: 80_000,
    contributionWon: 120_000,
  });
  assert.equal(
    scenarioMargin({ ...scenario, priceWon: 60_000 }, 4).contributionWon,
    160_000,
  );
  assert.equal(
    scenarioMargin({ ...scenario, variableCostWon: 20_000 }, 4).contributionWon,
    80_000,
  );
  assert.equal(scenarioMargin({ ...scenario, priceWon: null }, 4), null);
  assert.throws(() => scenarioMargin(scenario, -1), RangeError);
  assert.throws(
    () => scenarioMargin({ ...scenario, priceWon: Number.MAX_SAFE_INTEGER }, 2),
    RangeError,
  );
});
test("Korean deadline is exact at 14:00, also after the deadline", () => {
  const deadline = v2Reference.deadline;
  assert.deepEqual(
    deadlineRemaining(deadline, new Date("2026-11-22T14:00:00+09:00")),
    { expired: false, days: 1, hours: 0 },
  );
  assert.equal(
    deadlineRemaining(deadline, new Date("2026-11-23T13:59:59+09:00")).expired,
    false,
  );
  assert.deepEqual(
    deadlineRemaining(deadline, new Date("2026-11-23T14:00:00+09:00")),
    { expired: true, days: 0, hours: 0 },
  );
  assert.equal(
    deadlineRemaining(deadline, new Date("2026-11-24T14:00:00+09:00")).days,
    0,
  );
  assert.throws(() => deadlineRemaining("bad", now), RangeError);
});
test("planned mentoring, AI use and unvalidated documents do not count as completed", () => {
  const s = summarizeRows({
    mentoring: [{ ...base, id: "m", completed: false }],
    aiUsage: [{ ...base, id: "a", performed: false }],
    documents: [
      {
        ...base,
        id: "d",
        kind: "plan",
        status: "generated",
        renderedPages: 10,
      },
      {
        ...base,
        id: "n",
        kind: "report",
        status: "validated",
        renderedPages: null,
      },
    ],
    tasks: [
      { ...base, id: "t", status: "todo", dueAt: "2026-10-30T14:00:00+09:00" },
      {
        ...base,
        id: "done",
        status: "done",
        dueAt: "2026-10-30T14:00:00+09:00",
      },
    ],
  });
  assert.equal(s.mentoring, 0);
  assert.equal(s.aiUsage, 0);
  assert.equal(s.validatedDocuments, 0);
  assert.equal(s.overdue, 1);
  assert.equal(s.progress, 50);
});
