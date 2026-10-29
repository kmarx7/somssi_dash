import { OperationalPage } from "@/components/operations/operational-page";
export const metadata = { title: "팀원 관리" };
export default function Page() {
  return (
    <OperationalPage
      title="팀원 관리"
      description="실제 팀원과 외부 협력자·멘토의 역할·참여 기간을 구분합니다."
      kinds={["people"]}
    />
  );
}
