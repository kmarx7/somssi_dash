import { OperationalPage } from "@/components/operations/operational-page";
export const metadata = { title: "업무·마일스톤" };
export default function Page() {
  return (
    <OperationalPage
      title="업무·마일스톤"
      description="담당자·실제 완료일·가설·증빙을 연결합니다."
      kinds={["tasks", "milestones"]}
    />
  );
}
