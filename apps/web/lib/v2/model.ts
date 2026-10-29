// Contract for future authenticated storage; this file does not persist records.
export type RecordStatus =
  "계획" | "진행 중" | "실증 완료" | "확인 필요" | "확정";
export type Source = {
  source: string;
  checkedAt: string | null;
  status: RecordStatus;
};
export type BaseRecord = {
  id: string;
  projectId: string;
  provenance: Source;
  evidenceIds: string[];
};
export type Fund = "1r" | "ai" | "future";
export type Task = BaseRecord & {
  title: string;
  ownerId: string | null;
  dueAt: string;
  completedAt: string | null;
  status: "todo" | "in_progress" | "blocked" | "done";
  hypothesisId: string | null;
};
export type Hypothesis = BaseRecord & {
  goal: string;
  method: string;
  target: number | null;
  actual: number | null;
  unit: string;
  ownerId: string | null;
  dueAt: string | null;
  section: "Q1" | "Q2" | "Q3" | "Q4";
  revision: string;
};
export type ProductScenario = BaseRecord & {
  productId: string;
  title: string;
  kind: "confirmed" | "experiment";
  priceWon: number | null;
  minutes: number;
  capacity: number | null;
  fixedCostWon: number | null;
  variableCostWon: number | null;
};
export type PilotSession = BaseRecord & {
  scenarioId: string;
  date: string;
  venue: string;
  status: "planned" | "conducted";
  type: "free" | "paid";
  applied: number;
  attended: number;
  successful: number | null;
  satisfactionTotal: number | null;
  satisfactionResponses: number;
  minutes: number | null;
  problems: string;
  improvements: string;
};
// Anonymous participant IDs; do not put names, contact information or card data here.
export type Payment = BaseRecord & {
  pilotId: string;
  participantId: string;
  status: "pending" | "paid";
  amountWon: number;
};
export type SurveyResponse = BaseRecord & {
  surveyId: string;
  kind: "interview" | "survey";
  respondentId: string;
  completed: boolean;
  purchaseIntent: boolean | null;
  reservationInquiry: boolean;
  priceWon: number | null;
  preferredMinutes: number | null;
  preference: "participate" | "watch" | null;
  visitIncheon: boolean | null;
  culturalLink: boolean | null;
  extraVisit: boolean | null;
  extraSpending: boolean | null;
  overnight: boolean | null;
};
export type PartnerStage =
  "후보" | "접촉" | "회신" | "미팅" | "협의" | "협력의향" | "계약";
export type Partner = BaseRecord & {
  title: string;
  category: string;
  stage: PartnerStage;
  loiEvidenceId: string | null;
  contractEvidenceId: string | null;
};
// Expenses are immutable postings; correction postings require a server audit transaction.
export type Expense = BaseRecord & {
  fund: Fund;
  vendor: string;
  spentAt: string;
  category: string;
  amountWon: number;
  pilotId: string | null;
  correctionOfId: string | null;
  receipt: boolean;
  settlement: "unreviewed" | "pending_documents" | "settled";
};
export type BudgetAllocation = BaseRecord & {
  fund: Fund;
  category: string;
  amountWon: number;
  confirmed: boolean;
};
export type Mentoring = BaseRecord & {
  date: string;
  mentorId: string;
  completed: boolean;
  feedback: string;
  action: string;
  result: string;
  planRevision: string;
  meetingId: string | null;
};
export type AIUsage = BaseRecord & {
  solution: string;
  supportedProgram: boolean;
  date: string;
  performed: boolean;
  task: string;
  beforeMinutes: number | null;
  afterMinutes: number | null;
  costWon: number | null;
  output: string;
  reviewed: boolean;
  limitations: string;
  effect: string;
};
export type CostEstimate = BaseRecord & {
  vendor: string;
  received: boolean;
  amountWon: number;
};
export type DocumentGeneration = BaseRecord & {
  kind: string;
  templateId: string;
  templateHash: string;
  snapshotId: string;
  status: "queued" | "generated" | "validated" | "failed";
  renderedPages: number | null;
};
export type OperatingData = {
  tasks: readonly Task[];
  pilots: readonly PilotSession[];
  payments: readonly Payment[];
  surveys: readonly SurveyResponse[];
  partners: readonly Partner[];
  expenses: readonly Expense[];
  allocations: readonly BudgetAllocation[];
  mentoring: readonly Mentoring[];
  aiUsage: readonly AIUsage[];
  estimates: readonly CostEstimate[];
  documents: readonly DocumentGeneration[];
};
