export type NavItem = {
  href: string;
  title: string;
  icon: string;
  phase: string;
  description: string;
  external?: string;
};
export const navigation: { group: string; items: NavItem[] }[] = [
  {
    group: "PROJECT",
    items: [
      {
        href: "/business-plan",
        title: "사업계획·가설",
        icon: "document",
        phase: "V2",
        description: "Q1–Q4 기준과 자료 확보 상태를 확인합니다.",
      },
      {
        href: "/products",
        title: "가야금 상품",
        icon: "activity",
        phase: "V2",
        description: "상품 운영 가설과 미확인 가격을 구분합니다.",
      },
      {
        href: "/overview",
        title: "사업 개요",
        icon: "overview",
        phase: "M1",
        description: "SOMSSI 2라운드의 운영 흐름과 개발 단계를 확인합니다.",
      },
      {
        href: "/dashboard",
        title: "종합 대시보드",
        icon: "dashboard",
        phase: "M1",
        description: "오늘의 업무와 집행·증빙 현황을 한눈에 확인합니다.",
      },
      {
        href: "/schedule",
        title: "실행 일정",
        icon: "calendar",
        phase: "M2 · M3",
        description: "마일스톤과 활동 일정을 공통 데이터로 연결할 예정입니다.",
        external: "https://moonlit-rugelach-64f4b6.netlify.app/",
      },
      {
        href: "/activities",
        title: "사업 활동",
        icon: "activity",
        phase: "M2",
        description:
          "파일럿·방문·교육·회의를 등록하고 업무와 지출을 연결할 예정입니다.",
      },
      {
        href: "/tasks",
        title: "업무·마일스톤",
        icon: "tasks",
        phase: "M2",
        description: "담당자와 기한을 기준으로 실행할 업무를 관리합니다.",
      },
    ],
  },
  {
    group: "OPERATIONS",
    items: [
      {
        href: "/budget/allocate",
        title: "예산 배분표",
        icon: "budget",
        phase: "M3",
        description:
          "기존 200만 원 인터랙티브 배분표를 원본 앱에서 이용합니다.",
        external: "https://coruscating-duckanoo-f67d1c.netlify.app/",
      },
      {
        href: "/budget/expenses",
        title: "집행·정산 관리",
        icon: "expense",
        phase: "M4",
        description: "신청·승인·실제 지출·정산을 구분해 관리할 예정입니다.",
      },
      {
        href: "/meetings",
        title: "팀 회의록",
        icon: "meeting",
        phase: "M3",
        description:
          "회의 참석자·결정사항·후속 업무·회의비를 연결할 예정입니다.",
        external: "https://lighthearted-custard-cba5db.netlify.app/",
      },
      {
        href: "/evidence",
        title: "증빙 파일",
        icon: "folder",
        phase: "M4",
        description:
          "사진·영수증·서명을 비공개로 보관하고 보완 상태를 관리할 예정입니다.",
      },
      {
        href: "/documents",
        title: "공식 문서 출력",
        icon: "document",
        phase: "M5",
        description:
          "공식 DOCX 4종과 정산 XLSX 원본에 데이터를 주입할 예정입니다.",
      },
    ],
  },
  {
    group: "COLLABORATION",
    items: [
      {
        href: "/team",
        title: "팀원 관리",
        icon: "team",
        phase: "M2",
        description: "로그인 권한과 참여 인물 정보를 구분해 관리할 예정입니다.",
      },
      {
        href: "/partners",
        title: "제휴처 관리",
        icon: "partner",
        phase: "M6",
        description:
          "호텔·공간·멘토기관·협력사와 제휴 진행 상태를 관리할 예정입니다.",
      },
      {
        href: "/communications",
        title: "이메일 템플릿",
        icon: "mail",
        phase: "M3",
        description:
          "기존 이메일 도구를 이용하고 발송 이력은 이후 연결할 예정입니다.",
        external: "https://fluffy-florentine-6c87d5.netlify.app/",
      },
      {
        href: "/validation",
        title: "성과·파일럿",
        icon: "chart",
        phase: "M6",
        description:
          "사업가설과 무료·유료 파일럿의 검증 결과를 집계할 예정입니다.",
      },
      {
        href: "/settings",
        title: "프로젝트 설정",
        icon: "settings",
        phase: "M2",
        description:
          "프로젝트·비목·규정 버전·원본 양식·역할을 관리할 예정입니다.",
      },
    ],
  },
];
export const allItems = navigation.flatMap((group) => group.items);
export function getNavItem(path: string): NavItem {
  const item = allItems.find((item) => item.href === path);
  if (!item) throw new Error(`Unknown navigation path: ${path}`);
  return item;
}
