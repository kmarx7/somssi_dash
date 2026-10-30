import { z } from "zod";
import { domains, fieldsFor, type Field, type Payload } from "./domains.ts";
const validDate = (s: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(s) &&
  Number.isFinite(Date.parse(s)) &&
  new Date(s).toISOString().slice(0, 10) === s;
function fieldSchema(field: Field): z.ZodType {
  let schema: z.ZodType;
  switch (field.type) {
    case "boolean":
      return z.boolean();
    case "number":
      schema = z
        .number()
        .int()
        .min(field.min ?? 0)
        .max(field.max ?? 1_000_000_000);
      break;
    case "select":
      schema = z.enum(field.options as [string, ...string[]]);
      break;
    case "ref":
      schema = z.uuid();
      break;
    case "refs":
      return z
        .array(z.uuid())
        .max(100)
        .refine(
          (a) => new Set(a).size === a.length,
          "중복 ID는 허용되지 않습니다",
        )
        .refine((a) => !field.required || a.length > 0, "항목을 선택해 주세요");
    case "date":
      schema = z.string().refine(validDate, "유효한 날짜가 필요합니다");
      break;
    case "datetime":
      schema = z.iso.datetime({ offset: true });
      break;
    default:
      schema = z
        .string()
        .trim()
        .min(field.required ? 1 : 0)
        .max(field.type === "textarea" ? 8000 : 500);
  }
  return field.required ? schema : schema.nullable();
}
export function validatePayload(kind: string, input: unknown): Payload {
  if (!Object.hasOwn(domains, kind))
    throw new Error("지원하지 않는 데이터 유형입니다");
  const shape = Object.fromEntries(
    fieldsFor(kind).map((f) => [f.key, fieldSchema(f)]),
  );
  const p = z.strictObject(shape).parse(input) as Payload;
  const fail = (message: string) => {
    throw new Error(message);
  };
  if (kind === "calendarEvents") {
    if (String(p.startDate) > String(p.endDate))
      fail("종료일은 시작일 이후여야 합니다");
    if (p.allDay) {
      if (p.startTime !== null || p.endTime !== null)
        fail("종일 일정은 시간을 비워 주세요");
    } else {
      const validTime = (v: unknown) =>
        typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
      if (!validTime(p.startTime) || !validTime(p.endTime))
        fail("시작·종료 시간을 입력해 주세요");
      if (p.startDate === p.endDate && String(p.startTime) > String(p.endTime))
        fail("종료 시간은 시작 시간 이후여야 합니다");
    }
  }
  if (kind === "tasks" && (p.status === "done") !== (p.completedAt !== null))
    fail("완료 상태와 실제 완료일을 함께 입력해 주세요");
  if (
    kind === "scenarios" &&
    p.kind === "confirmed" &&
    (p.priceWon === null || p.capacity === null)
  )
    fail("확정 상품은 가격과 정원이 필요합니다");
  if (kind === "pilots") {
    const n = Number(p.attended),
      responses = Number(p.satisfactionResponses);
    if (
      p.status === "planned" &&
      (n !== 0 || responses !== 0 || p.successful !== null)
    )
      fail("계획 회차에 실제 실적을 입력할 수 없습니다");
    if (p.successful !== null && Number(p.successful) > n)
      fail("성공 인원은 참가 인원을 초과할 수 없습니다");
    if (responses > n) fail("만족도 응답 수는 참가 인원 이하여야 합니다");
    if ((responses === 0) !== (p.satisfactionTotal === null))
      fail("응답이 없으면 만족도 합계는 미입력으로 두세요");
    if (
      responses > 0 &&
      (Number(p.satisfactionTotal) < responses ||
        Number(p.satisfactionTotal) > 5 * responses)
    )
      fail("만족도는 응답자별 1~5점입니다");
  }
  if (
    kind === "payments" &&
    p.status === "paid" &&
    (p.paidAt === null || Number(p.amountWon) <= 0)
  )
    fail("실제 결제일과 양수 금액이 필요합니다");
  if (kind === "expenses") {
    if (p.correctionOfId === null && Number(p.amountWon) <= 0)
      fail("원거래 지출금액은 양수여야 합니다");
    if (p.correctionOfId !== null && (!p.correctionReason || p.amountWon === 0))
      fail("정정에는 사유와 0이 아닌 증감액이 필요합니다");
  }
  if (kind === "partners" && p.stage === "계약" && !p.contractEvidenceId)
    fail("계약 상태에는 계약 증빙을 연결해 주세요");
  if (kind === "milestones" && String(p.start) > String(p.end))
    fail("종료일은 시작일 이후여야 합니다");
  return p;
}
export const writeSchema = z.strictObject({
  kind: z.string().max(40),
  id: z.uuid(),
  expectedVersion: z.number().int().min(0),
  payload: z.unknown(),
});
