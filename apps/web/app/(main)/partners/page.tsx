import { OperationalPage } from "@/components/operations/operational-page";
export const metadata = { title: "제휴처 관리" };
export default function Page() {
  return (
    <OperationalPage
      title="제휴처 관리"
      description="접촉·협의·협력의향·계약과 실제 참여·지급을 구분합니다."
      kinds={["partners", "interactions"]}
    />
  );
}
