import type { StoredRecord } from "./domains.ts";
import type { OperatingData, BaseRecord } from "../v2/model.ts";
import { scenarioMargin } from "../v2/metrics.ts";
export function toOperatingData(
  records: readonly StoredRecord[],
): OperatingData {
  const convert = <T>(
    kind: string,
    transform: (r: StoredRecord) => object = () => ({}),
  ): T[] =>
    records
      .filter((r) => r.kind === kind)
      .map(
        (r) =>
          ({
            ...r.payload,
            id: r.id,
            projectId: r.project_id,
            evidenceIds: r.payload.evidenceIds,
            provenance: {
              source: r.payload.source,
              checkedAt: r.payload.checkedAt,
              status: r.payload.verificationStatus,
            },
            ...transform(r),
          }) as T,
      );
  const yn = (v: unknown) =>
    v === "예" ? true : v === "아니요" ? false : null;
  const result: OperatingData = {
    tasks: convert("tasks"),
    pilots: convert("pilots"),
    payments: convert("payments"),
    partners: convert("partners"),
    allocations: convert("allocations"),
    mentoring: convert("mentoring"),
    aiUsage: convert("aiUsage"),
    estimates: convert("estimates"),
    documents: [],
    surveys: convert("surveys", (r) => ({
      preference:
        r.payload.preference === "미응답" ? null : r.payload.preference,
      ...Object.fromEntries(
        [
          "purchaseIntent",
          "visitIncheon",
          "culturalLink",
          "extraVisit",
          "extraSpending",
          "overnight",
        ].map((k) => [k, yn(r.payload[k])]),
      ),
    })),
    expenses: convert("expenses", (r) => {
      const reviews = records
        .filter(
          (v) =>
            v.project_id === r.project_id &&
            v.kind === "expenseReviews" &&
            v.payload.expenseId === r.id,
        )
        .sort(
          (a, b) =>
            b.updated_at.localeCompare(a.updated_at) ||
            b.id.localeCompare(a.id),
        );
      const review = reviews[0];
      return review
        ? {
            receipt: review.payload.receipt,
            settlement: review.payload.settlement,
            evidenceIds: [
              ...new Set([
                ...(r.payload.evidenceIds as string[]),
                ...(review.payload.evidenceIds as string[]),
              ]),
            ],
          }
        : {};
    }),
  };
  // A correction changes the settlement basis. Count a group as settled only
  // after the original and every correction posting have an accepted review.
  const pendingGroups = new Set(
    result.expenses
      .filter((e) => e.settlement !== "settled")
      .map((e) => e.correctionOfId ?? e.id),
  );
  result.expenses = result.expenses.map((e) =>
    pendingGroups.has(e.correctionOfId ?? e.id) && e.settlement === "settled"
      ? { ...e, settlement: "unreviewed" }
      : e,
  );
  return result;
}
export function pilotResults(records: readonly StoredRecord[]) {
  const data = toOperatingData(records);
  return records
    .filter((r) => r.kind === "pilots")
    .map((r) => {
      const pilot = data.pilots.find((p) => p.id === r.id)!;
      const revenue = data.payments
        .filter((p) => p.pilotId === r.id && p.status === "paid")
        .reduce((n, p) => n + p.amountWon, 0);
      const costs = data.expenses
        .filter((e) => e.pilotId === r.id)
        .reduce((n, e) => n + e.amountWon, 0);
      return {
        id: r.id,
        title: String(r.payload.title),
        conducted: pilot.status === "conducted",
        attended: pilot.attended,
        revenue,
        costs,
        contribution: revenue - costs,
        satisfaction:
          pilot.satisfactionResponses > 0 && pilot.satisfactionTotal !== null
            ? pilot.satisfactionTotal / pilot.satisfactionResponses
            : null,
        achievement:
          pilot.attended > 0 && pilot.successful !== null
            ? (pilot.successful / pilot.attended) * 100
            : null,
      };
    });
}
export function scenarioResults(
  records: readonly StoredRecord[],
  participants: number,
) {
  return records
    .filter((r) => r.kind === "scenarios")
    .map((r) => ({
      id: r.id,
      title: String(r.payload.title),
      margin: scenarioMargin(
        {
          priceWon: r.payload.priceWon as number | null,
          fixedCostWon: r.payload.fixedCostWon as number | null,
          variableCostWon: r.payload.variableCostWon as number | null,
        },
        participants,
      ),
    }));
}
export function evidenceGaps(data: OperatingData) {
  const actual: BaseRecord[] = [
    ...data.pilots.filter((p) => p.status === "conducted"),
    ...data.mentoring.filter((m) => m.completed),
    ...data.aiUsage.filter((a) => a.performed),
    ...data.expenses.filter((e) => e.correctionOfId === null),
  ];
  return actual.filter((r) => r.evidenceIds.length === 0).map((r) => r.id);
}
