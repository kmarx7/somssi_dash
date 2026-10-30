import { ScenarioAnalysis } from "@/components/operations/analytics";
import {
  ConnectionNotice,
  RecordManager,
} from "@/components/operations/record-manager";
import { Badge, Notice, PageHeader, Panel } from "@/components/ui";
import { finalPlanReference, v2Reference } from "@/data/reference/v2";
export const metadata = { title: "가야금 상품" };
export default function Products() {
  return (
    <>
      <PageHeader
        eyebrow="GAYAGEUM · PRODUCT HYPOTHESIS"
        title="가야금 상품 검증 준비"
        description="확정 상품과 실험 시나리오를 구분합니다."
        action={<Badge tone="amber">상품·시나리오 관리</Badge>}
      />
      <ConnectionNotice />
      <ScenarioAnalysis />
      <RecordManager kind="products" />
      <RecordManager kind="scenarios" />
      <Notice>
        최종종합본의 가격·원가·정원은 고객 검증 전 가설입니다. 60분 관광형과
        이전 120~150분 몰입형을 비교하고 실제 선택·결제·환불로 검증합니다. 아래
        문서 기준값은 운영 상품·결제 데이터로 자동 등록되지 않습니다.
      </Notice>
      <Panel title="60분 관광형 · 초기 운영 가설" meta={<Badge>계획</Badge>}>
        <ul className="planned-list">
          {v2Reference.program.map((p) => (
            <li key={p.title}>
              <span>{p.minutes}분</span>
              {p.title}
            </li>
          ))}
        </ul>
        <p className="panel-note">
          총 {v2Reference.program.reduce((n, p) => n + p.minutes, 0)}분 · 출처:{" "}
          {v2Reference.source} · 확인일 {v2Reference.checkedAt}
        </p>
      </Panel>
      <Panel
        title="최종종합본 가격 구성 · 판매 가설"
        meta={<Badge>미검증 가설</Badge>}
      >
        <div className="table-scroll">
          <table>
            <caption className="sr-only">
              최종종합본 Q2의 검증 전 가격 가설
            </caption>
            <thead>
              <tr>
                <th>상품</th>
                <th>가정 가격</th>
                <th>구성</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {finalPlanReference.prices.map((p) => (
                <tr key={p.name}>
                  <td>{p.name}</td>
                  <td>{p.priceWon.toLocaleString("ko-KR")}원</td>
                  <td className="wrap-cell">{p.scope}</td>
                  <td>
                    <Badge>가설</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="panel-note">
          시범 운영 6~8명·최소 출발 3명은 운영 가설입니다. 악기 수량·강사·공간
          확인이 필요합니다. SIGNATURE 129,000원·고정비 160,000원·인당 변동비
          27,900원은 제한된 원가 항목의 시뮬레이션 가정입니다. 실제
          비용·수수료·환불·준비시간을 반영하기 전 최종 순이익으로 사용할 수
          없습니다.
        </p>
        <p className="panel-note">
          출처: {finalPlanReference.file} Q2 · 확인일{" "}
          {finalPlanReference.checkedAt} · 판매 확정 아님. 상품·시나리오 등록 시
          실제 검증 상태를 지정하세요.
        </p>
      </Panel>
    </>
  );
}
