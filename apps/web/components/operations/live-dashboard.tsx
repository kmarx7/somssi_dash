"use client";
import Link from "next/link";
import { Badge, Notice, PageHeader, Panel } from "@/components/ui";
import { SubmissionClock } from "@/components/submission-clock";
import { useWorkspace } from "./workspace";
import { ConnectionNotice } from "./record-manager";
import { sourceRegistry, v2Reference } from "@/data/reference/v2";
import { summarize } from "@/lib/v2/metrics";
import {
  toOperatingData,
  pilotResults,
  evidenceGaps,
} from "@/lib/operations/projection";
export function LiveDashboard() {
  const { workspace } = useWorkspace();
  const connected = workspace.state === "connected";
  const data = toOperatingData(workspace.records);
  const now = new Date();
  const stats = summarize(
    data,
    workspace.project?.id ?? "unconnected",
    now,
    Number(workspace.project?.budget_won ?? 2_000_000),
  );
  const gapIds = evidenceGaps(data);
  const seoulDay = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
  }).format(now);
  const weekStart = new Date(`${seoulDay}T00:00:00+09:00`);
  const seoulWeekday = new Date(weekStart.getTime() + 9 * 3600000).getUTCDay();
  weekStart.setUTCDate(weekStart.getUTCDate() - ((seoulWeekday + 6) % 7));
  const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
  const upcoming = data.tasks.filter(
    (t) => new Date(t.dueAt) >= weekStart && new Date(t.dueAt) < weekEnd,
  );
  const metrics = [
    [
      "업무 완료",
      `${stats.completed}/${stats.tasks}건`,
      stats.progress === null ? "업무 미등록" : `진행률 ${stats.progress}%`,
    ],
    ["고객 인터뷰", `${stats.interviews}명`, "완료 인터뷰의 익명 응답자 기준"],
    [
      "파일럿 운영",
      `${stats.pilots}회 / ${stats.participants}명`,
      "계획 회차는 제외",
    ],
    ["실제 결제", `${stats.paymentCount}건`, "결제 완료 기록 · 예약문의 제외"],
    [
      "실제 매출",
      `${stats.revenueWon.toLocaleString("ko-KR")}원`,
      "실제 선결제 포함 · 환불 처리 미지원",
    ],
    ["확보 견적서", `${stats.estimates}건`, "실제 확보 표시 기록 기준"],
    ["멘토링", `${stats.mentoring}회`, "실제 완료 기록 기준"],
  ];
  return (
    <>
      <PageHeader
        eyebrow="SOMSSI 2R · SUBMISSION READINESS"
        title="오늘의 실행과 제출 준비"
        description="같은 운영 기록으로 실증·집행·증빙을 집계합니다."
        action={
          <Badge tone={connected ? "green" : "amber"}>
            {connected ? "로컬 데이터" : "로컬 저장 확인 중"}
          </Badge>
        }
      />
      <ConnectionNotice />
      {!connected ? (
        <Notice>
          현재 로컬 운영 데이터를 읽지 못했습니다. 0은 등록 기록이 없다는
          의미이며 실제 실적·잔액을 확인한 값이 아닙니다.{" "}
          <Link className="text-link" href="/dashboard/demo">
            기존 데모 대시보드 보기 →
          </Link>
        </Notice>
      ) : null}
      <div className="metrics-grid">
        <article className="metric-card">
          <div className="metric-label">제출까지 남은 시간</div>
          <SubmissionClock deadline={workspace.project?.deadline} />
          <span>2026.11.23 14:00 · 한국시간 · 사용자 지정</span>
        </article>
        {metrics.map(([label, value, note]) => (
          <article className="metric-card" key={label}>
            <div className="metric-label">{label}</div>
            <strong>{value}</strong>
            <span>{connected ? note : "로컬 기록 확인 중"}</span>
          </article>
        ))}
      </div>
      <div className="two-columns">
        <Panel
          title="이번 주 업무·지연"
          meta={<Badge tone="amber">지연 {stats.overdue}건</Badge>}
        >
          <ul className="planned-list">
            {upcoming.map((t) => (
              <li key={t.id}>
                {t.title} ·{" "}
                {new Date(t.dueAt).toLocaleDateString("ko-KR", {
                  timeZone: "Asia/Seoul",
                })}{" "}
                · {t.status}
              </li>
            ))}
          </ul>
          {!upcoming.length ? (
            <p className="muted">이번 주 등록 업무가 없습니다.</p>
          ) : null}
          <Link href="/tasks" className="text-link">
            실제 업무 관리 →
          </Link>
          <details>
            <summary>초기 계획 마일스톤</summary>
            <ul className="planned-list">
              {v2Reference.milestones.map((m) => (
                <li key={m.start}>
                  {m.start} ~ {m.end} · {m.title} · 계획
                </li>
              ))}
            </ul>
          </details>
        </Panel>
        <Panel title="1R 활동자금 · 계획과 실집행">
          <dl className="budget-lines">
            {[
              [
                "기본 배정액",
                connected
                  ? `${Number(workspace.project?.budget_won).toLocaleString("ko-KR")}원`
                  : "2,000,000원 · 계획",
              ],
              [
                "확정 편성액",
                `${stats.allocatedWon.toLocaleString("ko-KR")}원`,
              ],
              ["실집행 순액", `${stats.spentWon.toLocaleString("ko-KR")}원`],
              [
                "잔액",
                connected
                  ? `${stats.remainingWon.toLocaleString("ko-KR")}원`
                  : "확인 필요",
              ],
              ["정산 완료액", `${stats.settledWon.toLocaleString("ko-KR")}원`],
            ].map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <p className="panel-note">
            AI 지원과 향후 최대3,000만원 조건부 자금은 별도 관리합니다. 원본
            배분표의 편성값을 지출로 가져오지 않습니다.
          </p>
          <Link className="text-link" href="/budget/allocate">
            기존 예산 배분표 →
          </Link>
        </Panel>
      </div>
      <div className="two-columns">
        <Panel title="조사·파트너·AI 활용">
          <dl className="budget-lines">
            {[
              ["설문상 구매의향", stats.purchaseIntent],
              ["예약문의", stats.reservationInquiries],
              ["접촉·회신·미팅", stats.partnerContact],
              ["협의·협력의향", stats.partnerNegotiation],
              ["계약 + 증빙 연결", stats.partnerContract],
              ["실제 AI 활용", stats.aiUsage],
            ].map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{value}건</dd>
              </div>
            ))}
          </dl>
          <p className="panel-note">
            설문은 소표본 조사 결과입니다. 구매의향·문의·실제 결제를 합산하지
            않습니다.
          </p>
        </Panel>
        <Panel title="미확보 증빙·공식 문서 준비">
          <p className="muted">
            실행 기록의 연결 증빙 누락 {gapIds.length}건 · 영수증 미보유{" "}
            {stats.missingReceipts.length}건. 공식 문서 완성률은 생성·렌더 검증
            전 확인 필요입니다.
          </p>
          <ul className="planned-list">
            {gapIds.map((id) => (
              <li key={id}>
                {String(
                  workspace.records.find((r) => r.id === id)?.payload.title ??
                    id,
                )}{" "}
                · 증빙 연결 필요
              </li>
            ))}
          </ul>
          <ul className="planned-list">
            {sourceRegistry
              .filter((s) => !s.available)
              .map((s) => (
                <li key={s.id}>{s.title} · 원본 미확보</li>
              ))}
          </ul>
          <Link className="text-link" href="/evidence">
            증빙 관리 →
          </Link>
        </Panel>
      </div>
      <Panel title="회차별 실제 손익·참여 결과">
        <div className="table-scroll">
          <table>
            <caption className="sr-only">파일럿 실제 운영 결과</caption>
            <thead>
              <tr>
                <th>회차</th>
                <th>상태·참가</th>
                <th>결제 매출</th>
                <th>집행 비용</th>
                <th>공헌이익</th>
                <th>만족도 / 성취율</th>
              </tr>
            </thead>
            <tbody>
              {pilotResults(workspace.records).map((p) => (
                <tr key={p.id}>
                  <td>{p.title}</td>
                  <td>
                    {p.conducted ? "운영 완료" : "계획"} · {p.attended}명
                  </td>
                  <td>{p.revenue.toLocaleString()}원</td>
                  <td>{p.costs.toLocaleString()}원</td>
                  <td>{p.contribution.toLocaleString()}원</td>
                  <td>
                    {p.satisfaction?.toFixed(1) ?? "미입력"} /{" "}
                    {p.achievement === null
                      ? "미입력"
                      : `${p.achievement.toFixed(1)}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
