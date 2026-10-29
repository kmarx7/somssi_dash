import { OperationalPage } from "@/components/operations/operational-page";
export const metadata = { title: "사업 활동" };
export default function Page() {
  return (
    <OperationalPage
      title="사업 활동"
      description="파일럿·참가자·실제 결제를 같은 원본 기록으로 관리합니다."
      kinds={["pilots", "participants", "payments"]}
    />
  );
}
