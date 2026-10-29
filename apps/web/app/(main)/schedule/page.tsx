import { OperationalPage } from "@/components/operations/operational-page";
export const metadata = { title: "실행 일정" };
export default function Page() {
  return (
    <OperationalPage
      title="실행 일정"
      description="마일스톤과 실제 업무 기한을 관리합니다."
      kinds={["milestones", "tasks"]}
      external="https://moonlit-rugelach-64f4b6.netlify.app/"
    />
  );
}
