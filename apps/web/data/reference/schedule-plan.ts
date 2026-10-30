import { emptyCalendarEvent } from "../../lib/operations/calendar.ts";
import { previousSchedulePlan } from "./schedule-plan-v1.ts";
import type { StoredRecord, Payload } from "../../lib/operations/domains.ts";
// Fixed IDs make installation resumable and preserve subsequent user edits.
const rows = [
  [
    "10-28",
    "11-03",
    "Q1 인천 관광·지역 예술인 문제와 경쟁상품 조사",
    "고객조사",
    "teal",
    "Q1·Q2: 인천 체류 외국인 FIT·호텔 투숙객을 초기 고객으로 검증. 관광 목적지 경쟁력·예술인의 상품화 과제를 출처와 함께 정리. 공항 환승객 전체를 구매 가능 고객으로 환산하지 않음.",
  ],
  [
    "10-30",
    "11-02",
    "가야금 60분 MVP 구성·운영 동선 설계",
    "상품",
    "violet",
    "Q2: 「줄을 다루는 솜씨」 60분 가설(소개10·주법20·아리랑 합주20·마무리10). 이전 120~150분 몰입형과 시간 선호·성취도·지도 품질 비교. 시범 정원6~8명·최소 출발3명은 가설이며 실제 악기·강사·동선 확인.",
  ],
  [
    "10-30",
    "11-03",
    "고객 인터뷰·가격·체험시간 설문 설계",
    "고객조사",
    "teal",
    "Q2: 외국인 인터뷰20~30명 제안 목표로 모집 설계. 직접 참여/관람, 60분/120분, 가격 단계, 문화 이야기 전후 방문·소비·숙박 의향 질문. 개인정보 최소수집, 의향·문의·예약금·실결제·환불 분리.",
  ],
  [
    "10-31",
    "11-03",
    "공간·악기·운영 견적 확보 및 예산 계획",
    "예산·정산",
    "amber",
    "Q2: 공간·악기·한복·영상 등 3~5개 항목·업체의 공급견적 확보 목표. 견적/집행 분리. 200만 원 활동자금의 공식 비목·적격성 확인. 향후 최대3천만 원 조건부 편성안과 혼합하지 않음.",
  ],
  [
    "11-01",
    "11-06",
    "지역 예술인·문화공간·관광 파트너 접촉",
    "파트너",
    "green",
    "후보·접촉·회신·미팅·협의·협력의향·계약 상태 구분. 실제 역할, 참여회차, 지급 조건 협의.",
  ],
  [
    "11-04",
    "11-08",
    "고객 인터뷰·설문 수집 및 가격 반응 분석",
    "고객조사",
    "teal",
    "Q2 제안 목표: 외국인 인터뷰20~30명. 실제 조사 인원·기간·장벽을 입력하고 60분/120분·가격별 선택을 분석. SIGNATURE 자체 선택률과 SIGNATURE 이상 선택률 분리. 의향은 실제 결제로 집계하지 않음.",
  ],
  [
    "11-04",
    "11-05",
    "초기 파일럿 모집·현장 리허설",
    "파일럿",
    "blue",
    "Q2: 무료·유료 합계1~2회 시범 운영 목표의 모집·리허설. 시범 정원6~8명·1인1대 악기·조율·강사 수·안전·한복/영상/다과 소요시간·완주 판정기준 확인. 운영일 미확정.",
  ],
  [
    "11-06",
    "11-08",
    "초기 파일럿 운영·목표 연주 성취도 확인",
    "파일럿",
    "blue",
    "Q2: 무료·유료 합계1~2회 중 초기 운영 예정 구간. 실제 시작/종료·조율 시간·모집방식·익명 언어 정보·강사 수·아리랑 선율 완주·만족도 기록. 실제 참가·동의사진·결과는 운영 후 등록.",
  ],
  [
    "11-09",
    "11-10",
    "초기 결과 정리·가격 및 상품 구성 수정",
    "상품",
    "violet",
    "실측 운영시간과 피드백을 바탕으로 60분/120분 구성, 가격 가설, 진행 동선을 비교·수정.",
  ],
  [
    "11-09",
    "11-10",
    "멘토링 일정 협의·검증 설계 피드백",
    "멘토링",
    "rose",
    "멘토·일시는 미확정. 실제 진행 후 피드백, 실행 활동, 결과, 사업계획서 수정사항과 증빙 기록.",
  ],
  [
    "11-11",
    "11-14",
    "유료 파일럿 판매·예약·결제 검증",
    "파일럿",
    "blue",
    "Q2: 무료·유료 합계1~2회 중 유료 검증 예정 구간. BASIC8.9만·SIGNATURE12.9만·PREMIUM15만·SPECIAL20만 원은 판매 가설. 가격별 실제 선택·예약금·결제·환불 증빙을 구분해 기록.",
  ],
  [
    "11-12",
    "11-16",
    "판매채널·파트너 협력 조건 협의",
    "파트너",
    "green",
    "Q2: 호텔·OTA·직접예약 중 2~3개 채널 검증 목표. 영문 제안서·QR·랜딩으로 유입→문의→예약→결제 추적. 수수료·예약정책 확인. LOI/계약 구분. MICE 단체는 악기·보조 지도자·견적 확보 전 상용 확정 금지.",
  ],
  [
    "11-15",
    "11-17",
    "실제 원가·공헌이익·집행 증빙 분석",
    "예산·정산",
    "amber",
    "Q2: SIGNATURE12.9만 원·회차 고정비16만 원·인당 변동비27,900원은 시뮬레이션 가정. 실제 견적·결제·환불·수수료·준비시간·보험·운반비로 보완. 공헌이익을 최종 순이익으로 표현하지 않음. 영수증 합계·공식 비목 대조.",
  ],
  [
    "11-16",
    "11-17",
    "Q3 확장·체류형 관광 연계 및 Q4 역할 정리",
    "상품",
    "violet",
    "Q3·Q4: 가야금→지역 예술인 시리즈→역사·문화·식음·숙박→탐색·예약·AI 보조. 협약기간 매출2,430만 원은 공급능력·계약 충족 가정의 목표이며 11월23일 달성 실적이 아님. 팀원 관계·합류일·실제 역할은 별도 확인.",
  ],
  [
    "11-18",
    "11-20",
    "Q1–Q4 사업계획서 실증 결과 반영",
    "문서·제출",
    "slate",
    "확정 실적·목표·가설을 구분하고 수치별 출처·산출근거 반영. 공식 양식 확보 후 본문 10페이지·서식 확인.",
  ],
  [
    "11-18",
    "11-20",
    "활동보고서·멘토링·AI 활용 기록 정리",
    "문서·제출",
    "slate",
    "실제 수행한 멘토링·활동자금·AI 활용만 반영. 공식 양식 확보 후 본문 5페이지 확인. 미지원 AI 솔루션 실적 생성 금지.",
  ],
  [
    "11-18",
    "11-20",
    "정산 상세내역·회의록·증빙 누락 보완",
    "예산·정산",
    "amber",
    "거래 합계·잔액, 영수증 발급, 증빙 연결 확인. 원본 DOCX/XLSX 양식과 대조.",
  ],
  [
    "11-21",
    "11-22",
    "최종 문서·수치·개인정보·제출파일 검증",
    "문서·제출",
    "red",
    "문서와 대시보드 원본 데이터 대조, 실제 페이지 수, 첨부 누락, 개인정보 노출, 파일 열림 확인.",
  ],
  [
    "11-23",
    "11-23",
    "2R 사업계획서·활동보고서 제출 마감",
    "문서·제출",
    "red",
    "14:00(KST) 마감. 실제 제출 후 접수 결과·제출본·확인 증빙 별도 기록. 제출 완료로 자동 처리하지 않음.",
  ],
  [
    "11-01",
    "11-05",
    "영문 스크립트·운영 매뉴얼·예약 FAQ 준비",
    "상품",
    "violet",
    "Q2: 영어 진행 스크립트·운영 매뉴얼·영문 예약안내·FAQ·예약폼·결제/취소/환불 규정 준비. 전통음악 용어·역사 정보는 전문가 검수. AI 지원 여부·사용 전후 시간·오류는 실제 활용 후 기록.",
  ],
  [
    "11-01",
    "11-04",
    "실명 경쟁상품 5~10개·공공통계 출처 확인",
    "고객조사",
    "teal",
    "Q1·Q2: 현재 판매 중인 가야금·전통예술·한복·공예 상품5~10개의 이름·URL·확인일·가격·시간·언어·위치·결과물·예약경로 비교. 동일 연도·조사대상의 정부/공공통계 원문·발표일 확인.",
  ],
  [
    "11-04",
    "11-10",
    "BASIC~SPECIAL 가격·선택 구성 비교",
    "상품",
    "violet",
    "Q2 판매 가설: BASIC89,000원(60분), SIGNATURE129,000원(+한복·개인영상), PREMIUM150,000원(+영문교재 또는 다과), SPECIAL200,000원(전용 회차·별도 협의). 실제 선택/실결제로 검증하며 SIGNATURE 자체/이상 선택률을 분리. 확정 상품으로 자동 전환하지 않음.",
  ],
  [
    "11-04",
    "11-05",
    "사진 동의·개인정보 최소수집·권리 상태 점검",
    "기타",
    "slate",
    "Q2: 사진 사용 동의·익명 참가자 코드·최소 개인정보 수집 확인. 상표출원의 실제 상태·완료일·증빙을 확인하고 미완료 항목은 예정/진행 중으로 구분.",
  ],
  [
    "11-08",
    "11-17",
    "인천 연계 동선·실제 추가 방문·지역 거래 기록",
    "파트너",
    "green",
    "Q1·Q3: 개항장·근대문화·식음·카페·숙박 연계 코스 초안. 체험 때문에 별도 인천 방문했는지, 실제 추가 방문·소비·숙박과 단순 의향 구분. 지역 예술인·공간·상인의 실제 보수·거래 기록.",
  ],
] as const;
export const schedulePlan = rows.map(
  (
    [start, end, title, category, color, description],
    i,
  ): { id: string; payload: Payload } => ({
    id: `a2682026-1123-4000-8000-${String(i + 1).padStart(12, "0")}`,
    payload: {
      ...emptyCalendarEvent(`2026-${start}`),
      endDate: `2026-${end}`,
      title,
      category,
      color,
      description,
      source:
        "SOMSSI_1R_최종종합본.docx Q1~Q4 · 내용 대조 2026-10-30 · 세부 날짜는 사용자 초기 계획",
      checkedAt: "2026-10-30",
      ...(i === 18
        ? { allDay: false, startTime: "14:00", endTime: "14:00" }
        : {}),
    },
  }),
);
export function missingSchedulePlan(ids: readonly string[]) {
  const existing = new Set(ids);
  return schedulePlan.filter((r) => !existing.has(r.id));
}

// Only fields still equal to the previous generated plan can be revised automatically.
// Manual edits, status, links, evidence, and completed/cancelled history are preserved.
export function schedulePlanChanges(records: readonly StoredRecord[]) {
  const byId = new Map(records.map((r) => [r.id, r]));
  return schedulePlan.flatMap((next) => {
    const current = byId.get(next.id);
    if (!current) return [{ ...next, version: 0 }];
    const before = previousSchedulePlan.find((r) => r.id === next.id);
    if (
      !before ||
      current.kind !== "calendarEvents" ||
      ["완료", "취소"].includes(String(current.payload.status))
    )
      return [];
    const payload = { ...current.payload };
    for (const key of ["title", "description", "source", "checkedAt"]) {
      if (current.payload[key] === before.payload[key])
        payload[key] = next.payload[key];
    }
    return JSON.stringify(payload) === JSON.stringify(current.payload)
      ? []
      : [{ id: next.id, payload, version: current.version }];
  });
}
