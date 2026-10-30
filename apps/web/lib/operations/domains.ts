// This registry drives forms, API validation and generated database validation rules.
export type Field = {
  key: string;
  label: string;
  type:
    | "text"
    | "textarea"
    | "date"
    | "datetime"
    | "number"
    | "boolean"
    | "select"
    | "ref"
    | "refs";
  required?: boolean;
  options?: readonly string[];
  ref?: string;
  min?: number;
  max?: number;
  step?: number;
};
export type Domain = {
  label: string;
  fields: readonly Field[];
  immutable?: boolean;
  uploadOnly?: boolean;
};
const text = (key: string, label: string, required = true): Field => ({
  key,
  label,
  type: "text",
  required,
});
const area = (key: string, label: string, required = false): Field => ({
  key,
  label,
  type: "textarea",
  required,
});
const num = (
  key: string,
  label: string,
  required = false,
  max = 1_000_000_000,
): Field => ({ key, label, type: "number", required, min: 0, max });
const select = (
  key: string,
  label: string,
  options: readonly string[],
): Field => ({ key, label, type: "select", options, required: true });
const ref = (
  key: string,
  label: string,
  target: string,
  required = false,
): Field => ({ key, label, type: "ref", ref: target, required });
const flag = (key: string, label: string): Field => ({
  key,
  label,
  type: "boolean",
  required: true,
});
const date = (key: string, label: string, required = true): Field => ({
  key,
  label,
  type: "date",
  required,
});
const time = (key: string, label: string, required = true): Field => ({
  key,
  label,
  type: "datetime",
  required,
});
const funds = ["1r", "ai", "future"] as const;
const title = text("title", "이름·제목");
export const domains: Record<string, Domain> = {
  documentDrafts: {
    label: "양식 입력·검토 초안",
    fields: [
      title,
      select("template", "원본 양식", [
        "meeting",
        "activity",
        "purchase",
        "details",
      ]),
      select("state", "초안 상태", ["작성 중", "보관"]),
      ref("calendarEventId", "근거 일정", "calendarEvents"),
      date("date", "회의·활동 날짜", false),
      { ...num("meetingNumber", "회의 차수", false), min: 1 },
      ref("previousDraftId", "이전 회의 초안", "documentDrafts"),
      area("previousReview", "이전 회의 후 확인된 내용·미확인 사항", false),
      text("startTime", "시작 시간 HH:mm", false),
      text("endTime", "종료 시간 HH:mm", false),
      text("venue", "장소", false),
      area("purpose", "목적", false),
      area("content", "내용·논의 (미확인 내용은 명시)", false),
      area("decisions", "결정사항", false),
      area("attendees", "실제 참석자·역할", false),
      select("receiptStatus", "영수증 발급 확인", [
        "확인 필요",
        "발급 확인",
        "미발급",
      ]),
      {
        key: "expenseIds",
        label: "연결 실제 지출",
        type: "refs",
        ref: "expenses",
      },
      {
        key: "photoIds",
        label: "사진 증빙 (별도첨부·Word 삽입은 수동)",
        type: "refs",
        ref: "evidence",
      },
      ref("estimateId", "거래명세·견적 (결제와 구분)", "estimates"),
      text("applicant", "신청자", false),
      text("institution", "기관", false),
      date("birthDate", "생년월일", false),
      text("phone", "연락처", false),
      area("idea", "아이디어", false),
      text("itemName", "물품명", false),
      area("rentalReason", "실제 임차 불가 사유", false),
    ],
  },
  documentGenerations: {
    label: "문서 생성 이력",
    immutable: true,
    uploadOnly: true,
    fields: [
      title,
      text("jobId", "생성 ID"),
      {
        key: "draftIds",
        label: "입력 초안",
        type: "refs",
        ref: "documentDrafts",
        required: true,
      },
      select("status", "검증 상태", ["검토 필요", "생성 실패"]),
      text("snapshotHash", "데이터 스냅샷 SHA-256"),
      text("manifestHash", "결과 목록 SHA-256"),
      area("checks", "구조·렌더 확인 및 미입력 항목", true),
    ],
  },
  calendarEvents: {
    label: "상세 일정",
    fields: [
      title,
      date("startDate", "시작일"),
      date("endDate", "종료일"),
      flag("allDay", "종일"),
      text("startTime", "시작 시간", false),
      text("endTime", "종료 시간", false),
      select("category", "분류", [
        "고객조사",
        "상품",
        "파일럿",
        "파트너",
        "멘토링",
        "예산·정산",
        "문서·제출",
        "기타",
      ]),
      select("color", "색상", [
        "blue",
        "teal",
        "green",
        "amber",
        "rose",
        "violet",
        "red",
        "slate",
      ]),
      select("status", "일정 상태", ["계획", "진행 중", "완료", "취소"]),
      area("description", "세부 내용·산출물"),
      ref("ownerId", "담당자", "people"),
      ref("taskId", "연결 업무", "tasks"),
      ref("hypothesisId", "관련 가설", "hypotheses"),
    ],
  },
  people: {
    label: "팀원·참여 인물",
    fields: [
      title,
      text("role", "담당 역할"),
      select("relationship", "구분", ["팀원", "외부 협력자", "멘토"]),
      date("start", "참여 시작", false),
      date("end", "참여 종료", false),
    ],
  },
  milestones: {
    label: "마일스톤",
    fields: [
      title,
      date("start", "시작일"),
      date("end", "목표일"),
      select("status", "상태", ["계획", "진행 중", "확정"]),
    ],
  },
  tasks: {
    label: "업무",
    fields: [
      title,
      ref("ownerId", "담당자", "people"),
      time("dueAt", "목표 일시"),
      select("status", "진행 상태", ["todo", "in_progress", "blocked", "done"]),
      time("completedAt", "실제 완료 일시", false),
      ref("hypothesisId", "관련 가설", "hypotheses"),
      ref("milestoneId", "관련 마일스톤", "milestones"),
    ],
  },
  hypotheses: {
    label: "사업가설",
    fields: [
      title,
      area("goal", "검증 목표", true),
      area("method", "실험 방법", true),
      num("target", "목표 수치"),
      num("actual", "측정 결과"),
      text("unit", "측정 단위", false),
      ref("ownerId", "담당자", "people"),
      time("dueAt", "마감", false),
      select("section", "사업계획 반영 위치", ["Q1", "Q2", "Q3", "Q4"]),
      area("revision", "검증을 통한 수정사항"),
    ],
  },
  products: {
    label: "상품",
    fields: [title, area("description", "상품 설명")],
  },
  scenarios: {
    label: "상품 시나리오",
    fields: [
      title,
      ref("productId", "상품", "products", true),
      select("kind", "상품 구분", ["experiment", "confirmed"]),
      num("priceWon", "1인 판매가격(원)"),
      num("minutes", "진행시간(분)", true, 1440),
      num("capacity", "정원", false, 10000),
      num("fixedCostWon", "회차 고정비(원)"),
      num("variableCostWon", "인당 변동비(원)"),
    ],
  },
  pilots: {
    label: "파일럿 회차",
    fields: [
      title,
      ref("scenarioId", "상품 시나리오", "scenarios", true),
      date("date", "운영 날짜"),
      text("venue", "장소"),
      select("status", "실행 상태", ["planned", "conducted"]),
      select("type", "유·무료", ["free", "paid"]),
      num("applied", "신청 인원", true, 10000),
      num("attended", "실제 참가 인원", true, 10000),
      num("successful", "목표 연주 성공 인원", false, 10000),
      num("satisfactionResponses", "만족도 응답 수", true, 10000),
      num("satisfactionTotal", "만족도 합계(각 1~5점)", false, 50000),
      num("minutes", "실제 운영시간(분)", false, 1440),
      area("problems", "운영 문제점"),
      area("improvements", "개선사항"),
    ],
  },
  participants: {
    label: "익명 참가자",
    fields: [
      text("title", "익명 식별명 (예: P001)"),
      ref("pilotId", "파일럿", "pilots", true),
    ],
  },
  surveyForms: {
    label: "조사 설계",
    fields: [
      title,
      area("audience", "조사 대상·모집 방법", true),
      area("questions", "설문 문항·선택지", true),
    ],
  },
  surveys: {
    label: "고객 응답",
    fields: [
      title,
      ref("surveyId", "조사 설계", "surveyForms", true),
      select("kind", "조사 방식", ["interview", "survey"]),
      text("respondentId", "익명 응답자 코드"),
      flag("completed", "조사 완료"),
      select("purchaseIntent", "설문상 구매 의향", ["미응답", "예", "아니요"]),
      flag("reservationInquiry", "실제 예약 문의"),
      num("priceWon", "선택 가격(원)"),
      num("preferredMinutes", "선호 시간(분)", false, 1440),
      select("preference", "직접 참여·관람", [
        "미응답",
        "participate",
        "watch",
      ]),
      ...[
        ["visitIncheon", "인천 방문 의향"],
        ["culturalLink", "역사·문화 연계 선호"],
        ["extraVisit", "추가 방문 의향"],
        ["extraSpending", "추가 소비 의향"],
        ["overnight", "숙박 의향"],
      ].map(([key, label]) => select(key, label, ["미응답", "예", "아니요"])),
    ],
  },
  payments: {
    label: "실제 결제",
    fields: [
      title,
      ref("pilotId", "파일럿", "pilots", true),
      ref("participantId", "익명 참가자", "participants", true),
      select("status", "결제 상태", ["pending", "paid"]),
      num("amountWon", "결제 금액(원)", true),
      date("paidAt", "결제일", false),
    ],
  },
  partners: {
    label: "협력 파트너",
    fields: [
      title,
      select("category", "유형", [
        "지역 예술인",
        "호텔",
        "문화공간",
        "관광사업자",
        "MICE",
        "기타",
      ]),
      select("stage", "협력 단계", [
        "후보",
        "접촉",
        "회신",
        "미팅",
        "협의",
        "협력의향",
        "계약",
      ]),
      ref("loiEvidenceId", "협력의향서(LOI)", "evidence"),
      ref("contractEvidenceId", "계약서", "evidence"),
    ],
  },
  interactions: {
    label: "파트너 접촉·참여",
    fields: [
      title,
      ref("partnerId", "파트너", "partners", true),
      date("date", "날짜"),
      area("result", "접촉 내용·결과·역할", true),
      ref("pilotId", "참여 회차", "pilots"),
      ref("expenseId", "지급 지출", "expenses"),
    ],
  },
  estimates: {
    label: "견적",
    fields: [
      title,
      text("vendor", "거래처"),
      flag("received", "실제 견적서 확보"),
      num("amountWon", "견적 금액(원)", true),
    ],
  },
  allocations: {
    label: "계획예산",
    fields: [
      title,
      select("fund", "자금 (1r/ai/future)", funds),
      text("category", "공식 비목 (운영기관 확인 필요)"),
      num("amountWon", "편성 금액(원)", true),
      flag("confirmed", "편성 확정"),
    ],
  },
  expenses: {
    label: "실제 지출·정정",
    fields: [
      title,
      select("fund", "자금 (1r/ai/future)", funds),
      text("vendor", "거래처"),
      date("spentAt", "집행일"),
      text("category", "공식 비목 (운영기관 확인 필요)"),
      {
        ...num("amountWon", "지출/정정 증감액(원)", true),
        min: -1_000_000_000,
      },
      ref("pilotId", "관련 파일럿", "pilots"),
      ref("correctionOfId", "정정할 원거래", "expenses"),
      area("correctionReason", "정정 사유"),
      flag("receipt", "영수증 보유"),
      select("settlement", "정산 상태", ["unreviewed", "pending_documents"]),
      select("eligibility", "집행 적격성", ["확인 필요", "운영기관 확인"]),
      text("evidenceType", "증빙 유형", false),
    ],
    immutable: true,
  },
  expenseReviews: {
    label: "지출 증빙·정산 검토",
    fields: [
      title,
      ref("expenseId", "원거래", "expenses", true),
      flag("receipt", "영수증 보유"),
      select("settlement", "정산 상태", [
        "unreviewed",
        "pending_documents",
        "settled",
      ]),
      area("notes", "검토 사유", true),
    ],
  },
  meetings: {
    label: "회의록",
    fields: [
      title,
      time("date", "회의 일시"),
      text("venue", "장소"),
      {
        key: "attendeeIds",
        label: "참석자",
        type: "refs",
        ref: "people",
        required: true,
      },
      area("agenda", "안건", true),
      area("discussion", "논의 내용", true),
      area("decisions", "결정사항", true),
      area("followUp", "담당 업무·실행 기한"),
      flag("receiptIssued", "영수증 발급 확인"),
      ref("expenseId", "회의비 지출", "expenses"),
    ],
  },
  mentoring: {
    label: "멘토링",
    fields: [
      title,
      date("date", "멘토링 날짜"),
      ref("mentorId", "멘토", "people", true),
      flag("completed", "실제 진행 완료"),
      area("feedback", "주요 피드백", true),
      area("action", "실행한 활동"),
      area("result", "실제 결과"),
      area("planRevision", "사업계획서 수정사항"),
      ref("meetingId", "관련 회의", "meetings"),
    ],
  },
  aiUsage: {
    label: "AI 활용",
    fields: [
      title,
      text("solution", "솔루션명"),
      flag("supportedProgram", "지원 프로그램 솔루션"),
      date("date", "활용 날짜"),
      flag("performed", "실제 활용 완료"),
      area("task", "활용 업무", true),
      num("beforeMinutes", "활용 전 작업시간(분)", false, 100000),
      num("afterMinutes", "활용 후 작업시간(분)", false, 100000),
      num("costWon", "비용(원)"),
      area("output", "결과물"),
      flag("reviewed", "검수 완료"),
      area("limitations", "오류·한계"),
      area("effect", "사업계획 개선 효과"),
    ],
  },
  evidence: {
    label: "비공개 증빙",
    fields: [
      title,
      text("evidenceType", "증빙 유형"),
      text("storagePath", "비공개 파일 경로"),
      text("originalName", "원본 파일명"),
      text("sha256", "SHA-256"),
      num("size", "파일 크기", true, 10485760),
      text("contentType", "파일 유형"),
    ],
    uploadOnly: true,
    immutable: true,
  },
};
export const provenanceFields: readonly Field[] = [
  text("source", "수치·내용의 출처"),
  date("checkedAt", "확인일", false),
  select("verificationStatus", "검증 상태", [
    "계획",
    "진행 중",
    "실증 완료",
    "확인 필요",
    "확정",
  ]),
  { key: "evidenceIds", label: "연결 증빙", type: "refs", ref: "evidence" },
];
export function fieldsFor(kind: string): readonly Field[] {
  return [...(domains[kind]?.fields ?? []), ...provenanceFields];
}
export type Payload = Record<
  string,
  string | number | boolean | string[] | null
>;
export type StoredRecord = {
  id: string;
  project_id: string;
  kind: string;
  payload: Payload;
  version: number;
  created_at: string;
  updated_at: string;
  created_by: string;
};
export const valueLabels: Record<string, string> = {
  todo: "예정",
  in_progress: "진행 중",
  blocked: "진행 막힘",
  done: "완료",
  planned: "계획",
  conducted: "운영 완료",
  free: "무료",
  paid: "결제 완료·유료",
  pending: "결제 대기",
  experiment: "실험",
  confirmed: "확정",
  unreviewed: "미검토",
  pending_documents: "증빙 보완",
  settled: "정산 완료",
  interview: "인터뷰",
  survey: "설문",
  participate: "직접 참여",
  watch: "관람",
  "1r": "1R 활동자금",
  ai: "AI 지원",
  future: "향후 조건부 자금",
};
