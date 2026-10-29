import { TaskList } from "@/components/task-list";
import { PageHeader } from "@/components/ui";
export default function Page() {
  return (
    <>
      <PageHeader
        eyebrow="DEMO"
        title="업무·마일스톤 데모"
        description="기존 샘플 업무 필터를 보존한 화면입니다. 저장되지 않습니다."
      />
      <TaskList />
    </>
  );
}
