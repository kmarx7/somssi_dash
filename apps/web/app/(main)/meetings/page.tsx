import { OperationalPage } from "@/components/operations/operational-page";
export const metadata = { title: "팀 회의록" };
export default function Page() {
  return (
    <OperationalPage
      title="팀 회의록"
      description="회의·결정·영수증 발급 확인과 멘토링 실적을 관리합니다."
      kinds={["meetings", "mentoring"]}
      external="https://lighthearted-custard-cba5db.netlify.app/"
    />
  );
}
