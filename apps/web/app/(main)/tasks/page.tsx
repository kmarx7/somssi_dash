import { PageHeader, Notice } from "@/components/ui";
import { TaskList } from "@/components/task-list";
export const metadata = { title: "업무·마일스톤" };
export default function Tasks() {
  return (
    <>
      <PageHeader
        eyebrow="TASKS & MILESTONES"
        title="업무·마일스톤"
        description="활동과 연결된 업무를 담당자·마감일·상태로 확인합니다."
        action={
          <button className="button" disabled title="업무 등록은 M2 예정">
            업무 등록 · 미구현
          </button>
        }
      />
      <Notice>
        현재는 데모 업무 조회 화면입니다. 입력값과 필터는 저장되지 않으며 실제
        업무와 연결되지 않습니다.
      </Notice>
      <TaskList />
    </>
  );
}
