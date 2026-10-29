import { ScenarioAnalysis } from "@/components/operations/analytics";
import {
  ConnectionNotice,
  RecordManager,
} from "@/components/operations/record-manager";
import { Badge, Notice, PageHeader, Panel } from "@/components/ui";
import { v2Reference } from "@/data/reference/v2";
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
        최종개정 사업계획서가 없어 가격·원가·정원은 미입력입니다. 60분과 120분은
        비교할 운영 가설이며 판매 확정 상품이나 실제 실적이 아닙니다.
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
      <Panel title="상품 시나리오 비교">
        <div className="table-scroll">
          <table>
            <caption className="sr-only">
              실험 상품 시나리오와 미확인 가격
            </caption>
            <thead>
              <tr>
                <th>시나리오</th>
                <th>시간</th>
                <th>가격</th>
                <th>정원·원가</th>
                <th>공헌이익</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["관광형", 60],
                ["몰입형", 120],
              ].map(([name, minutes]) => (
                <tr key={name}>
                  <td>{name}</td>
                  <td>{minutes}분</td>
                  <td>최종 사업계획서 확인 필요</td>
                  <td>미입력</td>
                  <td>산출 불가</td>
                  <td>
                    <Badge>가설</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="panel-note">
          가격·참가인원·회차 고정비·인당 변동비를 확보하면 매출 − 고정비 −
          인원×변동비로 회차 공헌이익을 계산합니다. 실제 회차는 결제·지출 원장을
          참조합니다.
        </p>
      </Panel>
    </>
  );
}
