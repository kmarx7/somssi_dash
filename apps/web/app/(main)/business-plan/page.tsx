import {
  ConnectionNotice,
  RecordManager,
} from "@/components/operations/record-manager";
import { Badge, Notice, PageHeader, Panel } from "@/components/ui";
import { planSections, sourceRegistry, v2Reference } from "@/data/reference/v2";
export const metadata = { title: "사업계획·가설" };
export default function BusinessPlan() {
  return (
    <>
      <PageHeader
        eyebrow="BUSINESS PLAN · Q1–Q4"
        title="사업계획·가설 준비"
        description={v2Reference.vision}
        action={<Badge tone="amber">가설 입력·출처 관리</Badge>}
      />
      <ConnectionNotice />
      <RecordManager kind="hypotheses" />
      <Notice>
        최종개정 사업계획서와 공식 HWP 양식이 미확보되어 문서 간 불일치를 아직
        판정할 수 없습니다. 아래 내용은 사용자 제공 요구사항에 따른 계획
        구조입니다.
      </Notice>
      <Panel title="SOMSSI 사업 정의">
        <p>{v2Reference.definition}</p>
        <p className="panel-note">
          AI는 다국어 고객안내·자료분석·상품추천·예약을 지원하는 기술입니다.
          사업의 핵심은 인천 로컬 문화관광경험입니다.
        </p>
      </Panel>
      <div className="two-columns">
        {planSections.map((q) => (
          <Panel
            key={q.id}
            title={`${q.id} ${q.title}`}
            meta={<Badge>원문 대조 대기</Badge>}
          >
            <ul className="planned-list">
              {q.items.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>
      <Panel title="성장 단계 · 계획">
        <ol className="planned-list">
          {v2Reference.growth.map((s, i) => (
            <li key={s}>
              <span>0{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
      </Panel>
      <Panel
        title="기준자료 확보 목록"
        meta={<Badge>로컬 조사 · 2026-10-29</Badge>}
      >
        <div className="table-scroll">
          <table>
            <caption className="sr-only">
              사업계획 및 제출자료 원본 확보 현황
            </caption>
            <thead>
              <tr>
                <th>자료</th>
                <th>파일</th>
                <th>확보 상태</th>
                <th>활용 목적</th>
              </tr>
            </thead>
            <tbody>
              {sourceRegistry.map((s) => (
                <tr key={s.id}>
                  <td>{s.title}</td>
                  <td className="wrap-cell">{s.file}</td>
                  <td>
                    <Badge tone={s.available ? "blue" : "amber"}>
                      {s.available ? "로컬 원본 확보" : "미확보"}
                    </Badge>
                  </td>
                  <td className="wrap-cell">{s.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="가설 등록 시 연결할 항목">
        <p className="muted">
          가설 ID · 검증 목표 · 실험 방법 · 목표/실제 수치와 단위 · 증빙 ·
          담당자 · 마감 · 검증 상태 · Q1–Q4 반영 위치 · 수정사항. 등록 기능은
          인증·서버 감사 이력 연결 후 구현합니다.
        </p>
        <p className="panel-note">
          출처: {v2Reference.source} · 확인일: {v2Reference.checkedAt} · 상태:
          계획. 가격·팀원·실적은 원본과 실제 자료 확인 전 미입력입니다.
        </p>
      </Panel>
    </>
  );
}
