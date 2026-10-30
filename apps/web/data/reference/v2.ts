// User-supplied planning references, never imported as observed operating results.
export const v2Reference = {
  checkedAt: "2026-10-30",
  source: "SOMSSI_1R_최종종합본.docx Q1~Q4 · 사용자 V2 요구사항",
  status: "계획",
  deadline: "2026-11-23T14:00:00+09:00",
  vision: "거쳐 가는 인천 → 찾아와 머무는 인천",
  definition:
    "SOMSSI는 인천 고유의 역사·문화·예술과 지역 생활자원을 관광객이 직접 경험하는 상품으로 연결하여, 인천을 거쳐 가는 도시에서 찾아와 머무는 독립적인 관광 목적지로 발전시키는 로컬 관광 브랜드이다.",
  growth: [
    "가야금 체험상품 검증과 유료판매",
    "인천 지역 예술인의 체험상품 시리즈 확장",
    "개항 역사·근대문화유산·관광지·식음·숙박을 결합한 체류형 관광상품",
    "인천 로컬 문화관광경험의 탐색·추천·예약 플랫폼",
  ],
  program: [
    { title: "감상 및 소개", minutes: 10 },
    { title: "기본 주법", minutes: 20 },
    { title: "주요 선율 합주", minutes: 20 },
    { title: "마무리 및 설문", minutes: 10 },
  ],
  funds: [
    {
      id: "1r",
      title: "1R 창업활동자금",
      amount: 2_000_000,
      state: "기본 배정 계획 · 실제 계좌·규정 미연결",
    },
    {
      id: "ai",
      title: "AI 솔루션 지원",
      amount: null,
      state: "해당 여부 확인 필요",
    },
    {
      id: "future",
      title: "향후 사업화자금",
      amount: 30_000_000,
      state: "최대 금액 · 조건부 계획 · 잔액에 미포함",
    },
  ],
  milestones: [
    { start: "2026-10-28", end: "2026-11-03", title: "조사 및 파일럿 설계" },
    { start: "2026-11-04", end: "2026-11-10", title: "고객조사와 초기 파일럿" },
    { start: "2026-11-11", end: "2026-11-17", title: "유료 검증과 비용 분석" },
    { start: "2026-11-18", end: "2026-11-20", title: "실적 반영 및 문서 작성" },
    { start: "2026-11-21", end: "2026-11-22", title: "최종 검증" },
    { start: "2026-11-23", end: "2026-11-23", title: "14:00 제출 완료 확인" },
  ],
} as const;

export const sourceRegistry = [
  {
    id: "final-plan",
    title: "1R 사업계획서 최종종합본",
    file: "SOMSSI_1R_최종종합본.docx",
    available: true,
    purpose: "Q1~Q4·목표·가격 가설 대조 완료 · 공식 양식/실적 확정 아님",
  },
  {
    id: "official-plan",
    title: "2R 공식 사업계획서",
    file: "공식 HWP/HWPX · 정확한 파일명 미확보",
    available: false,
    purpose: "Q1–Q4·10페이지·서식 검증",
  },
  {
    id: "official-report",
    title: "2R 공식 활동보고서",
    file: "공식 HWP/HWPX · 정확한 파일명 미확보",
    available: false,
    purpose: "멘토링·활동자금·AI·5페이지 검증",
  },
  {
    id: "company",
    title: "SOMSSI 회사소개서",
    file: "원본 파일명 미확보",
    available: false,
    purpose: "과거 상품·가격의 별도 보존",
  },
  {
    id: "expenses",
    title: "창업활동자금 집행 상세내역",
    file: "fund_usage_details.xlsx",
    available: true,
    purpose: "원본 21행·합계·인쇄설정 보존",
  },
  {
    id: "meeting",
    title: "팀 회의록",
    file: "meeting_minutes.docx",
    available: true,
    purpose: "원본 표·사진·서명·영수증 발급 확인 연결",
  },
  {
    id: "activity",
    title: "활동비 증빙",
    file: "activity_evidence.docx",
    available: true,
    purpose: "2R 활동보고서와 별개인 증빙 문서",
  },
  {
    id: "purchase",
    title: "물품 구매 사유서",
    file: "purchase_justification.docx",
    available: true,
    purpose: "실제 지출·물품사진 연결",
  },
  {
    id: "team",
    title: "팀원 참여 확인서",
    file: "team_participation.docx",
    available: true,
    purpose: "참여 역할·기간·서명 연결",
  },
] as const;

export const planSections = [
  {
    id: "Q1",
    title: "문제 인식",
    items: [
      "인천 관광 목적지 경쟁력",
      "외국인 관광객의 문제",
      "지역 예술인과 관광상품화의 문제",
      "해결방안 및 차별성",
    ],
  },
  {
    id: "Q2",
    title: "실현 가능성",
    items: [
      "가야금 MVP·60분 운영 가설",
      "가격·구성·고객조사·파일럿 결과",
      "경쟁상품·실제 원가·공헌이익",
      "판매채널·파트너 협력",
    ],
  },
  {
    id: "Q3",
    title: "성장전략",
    items: [
      "단계별 상품 확장",
      "역사·문화·식음·숙박 연계",
      "매출 목표·사업화자금 계획",
      "지역경제 기여지표",
    ],
  },
  {
    id: "Q4",
    title: "팀원",
    items: [
      "대표 및 실제 팀원",
      "담당 역할·참여 기간",
      "외부 협력자는 별도 관리",
    ],
  },
] as const;

// Document assumptions only; never seed these as actual sales or confirmed products.
export const finalPlanReference = {
  file: "SOMSSI_1R_최종종합본.docx",
  checkedAt: "2026-10-30",
  sha256: "f3716c83565f94cbf39b5494337a7c1b48ce6145d5dfb13a561d46cb28152faa",
  status: "가설",
  prices: [
    { name: "BASIC", priceWon: 89000, scope: "기본 60분 체험" },
    {
      name: "SIGNATURE",
      priceWon: 129000,
      scope: "BASIC + 한복 + 개인 연주 영상",
    },
    {
      name: "PREMIUM",
      priceWon: 150000,
      scope: "SIGNATURE + 영문 교재 또는 다과",
    },
    {
      name: "SPECIAL",
      priceWon: 200000,
      scope: "소규모 전용 회차 + 별도 협의 구성",
    },
  ],
  targets: {
    interviewsMin: 20,
    interviewsMax: 30,
    pilotsMin: 1,
    pilotsMax: 2,
    estimatesMin: 3,
    estimatesMax: 5,
    channelsMin: 2,
    channelsMax: 3,
  },
} as const;
