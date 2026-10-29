import Link from "next/link";
import { Badge, PageHeader, Panel } from "@/components/ui";
import { Icon } from "@/components/icon";
import {
  demoMilestones,
  demoProject as p,
  demoTasks,
  taskStatus,
  won,
} from "@/data/demo/project";
export const metadata = { title: "종합 대시보드" };
export default function Dashboard() {
  const completed = demoTasks.filter((t) => t.status === "done").length;
  const metrics = [
    ["총 예산", won(p.totalBudget), "프로젝트 초기 설정값", "budget"],
    [
      "실제 지출",
      won(p.actualSpent),
      "증빙 보완 건도 포함한 데모 값",
      "expense",
    ],
    [
      "현금 예산 잔액",
      won(p.totalBudget - p.actualSpent),
      "총 예산 − 실제 지출",
      "chart",
    ],
    [
      "미완료 업무",
      `${demoTasks.length - completed}건`,
      `전체 ${demoTasks.length}건 중 ${completed}건 완료`,
      "tasks",
    ],
  ];
  return (
    <>
      <PageHeader
        eyebrow="WORKSPACE DASHBOARD"
        title="오늘의 실행을 확인하세요."
        description="업무와 집행 현황을 함께 살펴보고, 다음으로 할 일을 정리합니다."
        action={
          <Link href="/tasks" className="button">
            업무 목록 보기 <Icon name="arrow" size={16} />
          </Link>
        }
      />
      <div className="metrics-grid">
        {metrics.map(([label, value, note, icon]) => (
          <article className="metric-card" key={label}>
            <div className="metric-label">
              {label}
              <Icon name={icon} />
            </div>
            <strong>{value}</strong>
            <span>{note}</span>
            <span className="metric-demo">데모</span>
          </article>
        ))}
      </div>
      <div className="dashboard-grid">
        <Panel
          title="우선 확인할 업무"
          meta={
            <Link href="/tasks" className="text-link">
              전체 보기 →
            </Link>
          }
        >
          <div className="task-preview">
            {demoTasks
              .filter((t) => t.status !== "done")
              .map((t) => (
                <div className="preview-row" key={t.id}>
                  <span
                    className={`task-marker ${t.status}`}
                    aria-hidden="true"
                  />
                  <div>
                    <strong>{t.title}</strong>
                    <small>
                      {t.owner} · {t.due.slice(5).replace("-", ".")} 마감
                    </small>
                  </div>
                  <Badge tone={t.status === "blocked" ? "amber" : "blue"}>
                    {taskStatus[t.status]}
                  </Badge>
                </div>
              ))}
          </div>
          <div className="completion">
            <div>
              <span>데모 업무 진행률</span>
              <strong>
                {completed} / {demoTasks.length} 완료
              </strong>
            </div>
            <progress
              value={completed}
              max={demoTasks.length}
              aria-label="데모 업무 완료율"
            />
          </div>
        </Panel>
        <Panel title="다가오는 마일스톤" meta={<Badge>데모 일정</Badge>}>
          <ol className="milestones">
            {demoMilestones.map((m) => (
              <li key={m.id}>
                <time>{m.date}</time>
                <div>
                  <strong>{m.title}</strong>
                  <p>{m.detail}</p>
                </div>
                <Badge tone={m.status === "진행 중" ? "blue" : "neutral"}>
                  {m.status}
                </Badge>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
      <div className="dashboard-grid">
        <Panel title="예산·집행 요약" meta={<Badge>데모 · 원 단위</Badge>}>
          <div className="budget-line">
            <span>실제 지출 / 총 예산</span>
            <strong>
              {won(p.actualSpent)} <span>/ {won(p.totalBudget)}</span>
            </strong>
          </div>
          <progress
            className="budget-progress"
            value={p.actualSpent}
            max={p.totalBudget}
            aria-label="데모 예산 집행 비율"
          />
          <dl className="budget-summary">
            <div>
              <dt>승인 후 미집행 약정</dt>
              <dd>{won(p.pendingCommitments)}</dd>
            </div>
            <div>
              <dt>추가 약정 가능액</dt>
              <dd>
                {won(p.totalBudget - p.actualSpent - p.pendingCommitments)}
              </dd>
            </div>
            <div>
              <dt>정산 완료액</dt>
              <dd>{won(p.settled)}</dd>
            </div>
          </dl>
          <p className="panel-note">
            편성·예정·신청·승인 합계는 아직 연결되지 않았습니다. 위 금액은 화면
            설명용 데모이며 회계 기능은 M4에서 구현합니다.
          </p>
          <Link href="/budget/allocate" className="text-link">
            기존 예산 배분표 연결 →
          </Link>
        </Panel>
        <Panel
          title="놓치지 말아야 할 항목"
          meta={<Badge tone="amber">데모 알림</Badge>}
        >
          <div className="alert-item">
            <span className="alert-icon">
              <Icon name="alert" />
            </span>
            <div>
              <strong>증빙 보완이 필요한 지출</strong>
              <p>
                데모 사례: 영수증 없이 집행된 거래는 보완 대상으로 유지합니다.
              </p>
              <Link className="text-link" href="/evidence">
                증빙 관리 범위 확인 →
              </Link>
            </div>
          </div>
          <div className="alert-item">
            <span className="icon-box">
              <Icon name="document" />
            </span>
            <div>
              <strong>공식 문서 생성은 준비 중</strong>
              <p>
                원본 DOCX·XLSX를 보존하며, 생성과 검증 기능은 M5 예정입니다.
              </p>
              <Link className="text-link" href="/documents">
                원본 양식 목록 확인 →
              </Link>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}
