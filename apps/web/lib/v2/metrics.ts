import type { OperatingData, ProductScenario } from "./model";

const sum = (values: readonly number[]) =>
  values.reduce((a, b) => {
    if (!Number.isSafeInteger(b) || !Number.isSafeInteger(a + b))
      throw new RangeError("원 단위 안전 정수 범위 필요");
    return a + b;
  }, 0);

export function deadlineRemaining(deadline: string, now: Date) {
  const remaining = Date.parse(deadline) - now.getTime();
  if (!Number.isFinite(remaining)) throw new RangeError("유효한 날짜 필요");
  return {
    expired: remaining <= 0,
    days: Math.max(0, Math.floor(remaining / 86_400_000)),
    hours: Math.max(0, Math.floor(remaining / 3_600_000) % 24),
  };
}

export function scenarioMargin(
  scenario: Pick<
    ProductScenario,
    "priceWon" | "fixedCostWon" | "variableCostWon"
  >,
  participants: number,
) {
  if (!Number.isSafeInteger(participants) || participants < 0)
    throw new RangeError("인원은 0 이상의 정수 필요");
  const { priceWon, fixedCostWon, variableCostWon } = scenario;
  if (priceWon === null || fixedCostWon === null || variableCostWon === null)
    return null;
  if (
    [priceWon, fixedCostWon, variableCostWon].some(
      (n) => !Number.isSafeInteger(n) || n < 0,
    )
  )
    throw new RangeError("가격·원가는 0 이상의 정수 필요");
  const revenueWon = sum([priceWon * participants]);
  const costWon = sum([fixedCostWon, variableCostWon * participants]);
  return { revenueWon, costWon, contributionWon: sum([revenueWon, -costWon]) };
}

export function summarize(
  data: OperatingData,
  projectId: string,
  now: Date,
  budgetWon = 2_000_000,
) {
  const scoped = <T extends { projectId: string }>(rows: readonly T[]) =>
    rows.filter((r) => r.projectId === projectId);
  const tasks = scoped(data.tasks);
  const pilots = scoped(data.pilots).filter((p) => p.status === "conducted");
  const payments = scoped(data.payments).filter((p) => p.status === "paid");
  const expenses = scoped(data.expenses).filter((e) => e.fund === "1r");
  const spentWon = sum(expenses.map((e) => e.amountWon));
  const surveys = scoped(data.surveys).filter((r) => r.completed);
  const partners = scoped(data.partners);
  const completed = tasks.filter((t) => t.status === "done").length;
  return {
    tasks: tasks.length,
    completed,
    progress: tasks.length
      ? Math.round((completed / tasks.length) * 100)
      : null,
    overdue: tasks.filter(
      (t) => t.status !== "done" && Date.parse(t.dueAt) < now.getTime(),
    ).length,
    interviews: new Set(
      surveys.filter((r) => r.kind === "interview").map((r) => r.respondentId),
    ).size,
    purchaseIntent: surveys.filter((r) => r.purchaseIntent === true).length,
    reservationInquiries: surveys.filter((r) => r.reservationInquiry).length,
    pilots: pilots.length,
    participants: pilots.reduce((n, p) => n + p.attended, 0),
    paymentCount: payments.length,
    payingParticipants: new Set(
      payments.map((p) => `${p.pilotId}:${p.participantId}`),
    ).size,
    revenueWon: sum(payments.map((p) => p.amountWon)),
    allocatedWon: sum(
      scoped(data.allocations)
        .filter((a) => a.fund === "1r" && a.confirmed)
        .map((a) => a.amountWon),
    ),
    spentWon,
    remainingWon: sum([budgetWon, -spentWon]),
    settledWon: sum(
      expenses
        .filter((e) => e.settlement === "settled")
        .map((e) => e.amountWon),
    ),
    missingReceipts: expenses
      .filter((e) => !e.receipt && e.correctionOfId === null)
      .map((e) => e.id),
    estimates: scoped(data.estimates).filter((e) => e.received).length,
    partnerContact: partners.filter((p) =>
      ["접촉", "회신", "미팅"].includes(p.stage),
    ).length,
    partnerNegotiation: partners.filter(
      (p) => p.stage === "협의" || p.stage === "협력의향",
    ).length,
    partnerContract: partners.filter(
      (p) => p.stage === "계약" && p.contractEvidenceId !== null,
    ).length,
    mentoring: scoped(data.mentoring).filter((m) => m.completed).length,
    aiUsage: scoped(data.aiUsage).filter((a) => a.performed).length,
    // Template possession and generated-but-unvalidated files are never completion.
    validatedDocuments: new Set(
      scoped(data.documents)
        .filter(
          (d) =>
            d.status === "validated" &&
            d.renderedPages !== null &&
            d.renderedPages > 0,
        )
        .map((d) => d.kind),
    ).size,
  };
}
