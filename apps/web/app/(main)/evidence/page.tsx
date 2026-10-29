import { PageHeader } from "@/components/ui";
import { EvidenceManager } from "@/components/operations/evidence-manager";
export const metadata = { title: "증빙 파일" };
export default function Page() {
  return (
    <>
      <PageHeader
        eyebrow="PRIVATE EVIDENCE"
        title="증빙 파일"
        description="증빙을 비공개로 보관하고 활동·지출·회의에 연결합니다."
      />
      <EvidenceManager />
    </>
  );
}
