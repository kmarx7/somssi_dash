import type { OperatingData } from "../../lib/v2/model";

// Explicit disconnected state. Never seed from demo, template examples or legacy plans.
// Replace through an authenticated server repository only after backup/RLS/audit verification.
export const operatingData: OperatingData = {
  tasks: [],
  pilots: [],
  payments: [],
  surveys: [],
  partners: [],
  expenses: [],
  allocations: [],
  mentoring: [],
  aiUsage: [],
  estimates: [],
  documents: [],
};
export const operatingDataConnection = "disconnected" as const;
