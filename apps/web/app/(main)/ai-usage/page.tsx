import { OperationalPage } from "@/components/operations/operational-page";
export const metadata = { title: "AI 솔루션 활용" };
export default function Page() {
  return (
    <OperationalPage
      title="AI 솔루션 활용"
      description="지원 프로그램 여부·실제 활용·검수·전후 작업시간을 기록합니다."
      kinds={["aiUsage"]}
    />
  );
}
