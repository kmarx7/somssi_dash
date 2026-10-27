// Synthetic M1 display data. Never imported into production storage or accounting.
export const demoProject = {
  name: "SOMSSI",
  program: "모두의창업",
  round: "2라운드",
  totalBudget: 2_000_000,
  actualSpent: 400_000,
  pendingCommitments: 100_000,
  settled: 250_000,
} as const;
export const demoMilestones = [
  {
    id: "demo-milestone-1",
    date: "10.29",
    title: "파일럿 운영안 정리",
    detail: "프로그램 구성 · 역할 분담",
    status: "진행 중",
  },
  {
    id: "demo-milestone-2",
    date: "11.04",
    title: "협력 공간 미팅",
    detail: "제휴 조건 · 운영 동선 확인",
    status: "예정",
  },
  {
    id: "demo-milestone-3",
    date: "11.12",
    title: "첫 파일럿 운영",
    detail: "현장 사진 · 참가자 피드백 수집",
    status: "예정",
  },
] as const;
export type DemoTask = {
  id: string;
  title: string;
  activityId: string;
  activity: string;
  owner: string;
  due: string;
  status: "todo" | "in_progress" | "blocked" | "done";
  priority: string;
};
export const demoTasks: readonly DemoTask[] = [
  {
    id: "demo-task-1",
    title: "파일럿 프로그램 구성안 정리",
    activityId: "demo-activity-1",
    activity: "첫 파일럿 준비",
    owner: "데모 담당자 A",
    due: "2026-10-29",
    status: "in_progress",
    priority: "높음",
  },
  {
    id: "demo-task-2",
    title: "협력 공간 미팅 질문지 작성",
    activityId: "demo-activity-2",
    activity: "협력 공간 미팅",
    owner: "데모 담당자 B",
    due: "2026-11-02",
    status: "todo",
    priority: "보통",
  },
  {
    id: "demo-task-3",
    title: "활동 사진·영수증 보완 확인",
    activityId: "demo-activity-3",
    activity: "데모 교육 참가",
    owner: "데모 담당자 A",
    due: "2026-11-03",
    status: "blocked",
    priority: "높음",
  },
  {
    id: "demo-task-4",
    title: "파일럿 설문 초안 검토",
    activityId: "demo-activity-1",
    activity: "첫 파일럿 준비",
    owner: "데모 담당자 B",
    due: "2026-10-27",
    status: "done",
    priority: "보통",
  },
];
export const taskStatus = {
  todo: "예정",
  in_progress: "진행 중",
  blocked: "진행 막힘",
  done: "완료",
} as const;
export const won = (amount: number) => `${amount.toLocaleString("ko-KR")}원`;
