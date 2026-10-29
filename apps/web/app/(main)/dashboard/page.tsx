import Link from "next/link";
import { Badge, Notice, PageHeader, Panel } from "@/components/ui";
import { SubmissionClock } from "@/components/submission-clock";
import { operatingData } from "@/data/reference/operating-data";
import { sourceRegistry, v2Reference } from "@/data/reference/v2";
import { summarize } from "@/lib/v2/metrics";
export const metadata = { title: "종합 대시보드" };
export default function Dashboard() {
  // No operational repository is connected. Empty records are not a verified zero balance.
  const stats = summarize(operatingData, "somssi-2r", new Date());
  const metrics = [
    [
      "업무 완료",
      `${stats.completed} / ${stats.tasks}건`,
      "진행률 미입력 · 업무 저장 미연결",
    ],
    [
      "고객 인터뷰",
      `${stats.interviews}명`,
      "조사 응답 미연결 · 구매의향과 결제 분리",
    ],
    [
      "파일럿 운영",
      `${stats.pilots}회 / ${stats.participants}명`,
      "실제 운영 완료 기록 기준",
    ],
    ["실제 결제", `${stats.paymentCount}건`, "예약문의·설문 의향 미포함"],
    [
      "실제 매출",
      `${stats.revenueWon.toLocaleString("ko-KR")}원`,
      "결제 데이터 미연결 · 실제 매출 미확인",
    ],
    ["확보 견적서", `${stats.estimates}건`, "받은 견적 기록 기준"],
    ["멘토링", `${stats.mentoring}회`, "실제 완료 기록 기준"],
  ];
  return (
    <>
      <PageHeader
        eyebrow="SOMSSI 2R · SUBMISSION READINESS"
        title="오늘의 실행과 제출 준비"
        description="실제 등록된 기록을 기준으로 실증·집행·제출을 연결합니다."
        action={<Badge tone="amber">데이터 미연결 · 읽기 전용</Badge>}
      />
      <Notice>
        현재 실제 운영 데이터 저장소가 연결되지 않았습니다. 0은 이 앱에 등록된
        기록이 없다는 의미이며 실제 실적·잔액을 확인한 값이 아닙니다.{" "}
        <Link href="/dashboard/demo" className="text-link">
          기존 데모 대시보드 보기 →
        </Link>
      </Notice>
      <div className="metrics-grid">
        <article className="metric-card">
          <div className="metric-label">제출까지 남은 시간</div>
          <SubmissionClock />
          <span>2026.11.23 14:00 · 한국시간 · 사용자 지정</span>
        </article>
        {metrics.map(([label, value, note]) => (
          <article className="metric-card" key={label}>
            <div className="metric-label">{label}</div>
            <strong>{value}</strong>
            <span>{note}</span>
          </article>
        ))}
      </div>
      <div className="two-columns">
        <Panel title="이번 주 업무·지연 작업" meta={<Badge>미입력</Badge>}>
          <p className="muted">
            실제 업무 미등록 · 지연 {stats.overdue}건. 아래 일정은 초기 계획이며
            완료 실적이 아닙니다.
          </p>
          <ul className="planned-list">
            {v2Reference.milestones.map((m) => (
              <li key={m.start}>
                <div>
                  <strong>{m.title}</strong>
                  <small className="muted">
                    {" "}
                    {m.start} ~ {m.end} · 계획
                  </small>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="예산과 실제 집행" meta={<Badge>1R 자금 별도 관리</Badge>}>
          <dl className="budget-lines">
            <div>
              <dt>기본 배정 계획</dt>
              <dd>2,000,000원</dd>
            </div>
            <div>
              <dt>확정 편성액</dt>
              <dd>미입력</dd>
            </div>
            <div>
              <dt>집행 등록 합계</dt>
              <dd>{stats.spentWon.toLocaleString("ko-KR")}원 · 미연결</dd>
            </div>
            <div>
              <dt>실제 잔액</dt>
              <dd>확인 필요</dd>
            </div>
          </dl>
          <p className="panel-note">
            편성 시뮬레이션은 실제 지출이 아닙니다. AI 지원은 해당 여부 확인
            필요, 향후 최대 3,000만 원은 조건부 계획으로 합산하지 않습니다.
          </p>
          <Link href="/budget/allocate" className="text-link">
            기존 예산 배분표 열기 →
          </Link>
        </Panel>
      </div>
      <div className="two-columns">
        <Panel title="파트너 협력 단계">
          <dl className="budget-lines">
            <div>
              <dt>접촉·회신·미팅</dt>
              <dd>{stats.partnerContact}건</dd>
            </div>
            <div>
              <dt>협의·협력의향</dt>
              <dd>{stats.partnerNegotiation}건</dd>
            </div>
            <div>
              <dt>계약 + 계약 증빙 연결</dt>
              <dd>{stats.partnerContract}건</dd>
            </div>
          </dl>
          <p className="panel-note">
            등록 데이터 없음. LOI와 계약은 구분하며 접촉 기관을 확정 파트너로
            세지 않습니다.
          </p>
        </Panel>
        <Panel
          title="제출서류·증빙 준비"
          meta={<Badge tone="amber">출력 미구현</Badge>}
        >
          <p className="muted">
            공식 제출서류 완성률: 확인 필요. 검증 완료 문서{" "}
            {stats.validatedDocuments}종. 원본 양식 확보는 문서 완성을 뜻하지
            않습니다.
          </p>
          <ul className="planned-list">
            {sourceRegistry
              .filter((s) => !s.available)
              .map((s) => (
                <li key={s.id}>
                  <div>
                    <strong>{s.title}</strong>
                    <small className="muted"> · 원본 미확보</small>
                  </div>
                </li>
              ))}
          </ul>
          <p className="panel-note">
            증빙 누락 여부는 실제 활동·지출 연결 후 판정합니다. 현재 거래 증빙
            미등록·판정 불가.
          </p>
          <Link href="/documents" className="text-link">
            원본·출력 준비 상태 확인 →
          </Link>
        </Panel>
      </div>
    </>
  );
}
