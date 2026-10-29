"use client";
import { useState } from "react";
import { Panel } from "@/components/ui";
import { useWorkspace } from "./workspace";
import { scenarioResults, toOperatingData } from "@/lib/operations/projection";
export function ScenarioAnalysis() {
  const { workspace } = useWorkspace();
  const [participants, setParticipants] = useState(4);
  return (
    <Panel title="가격·원가 시나리오 손익">
      <div className="task-controls">
        <label>
          <span>비교 참가 인원</span>
          <input
            type="number"
            min={0}
            max={10000}
            value={participants}
            onChange={(e) =>
              setParticipants(
                Math.max(
                  0,
                  Math.min(10000, Math.floor(Number(e.target.value) || 0)),
                ),
              )
            }
          />
        </label>
      </div>
      <div className="table-scroll">
        <table>
          <caption className="sr-only">가정 인원별 상품 손익 비교</caption>
          <thead>
            <tr>
              <th>시나리오</th>
              <th>계획 매출</th>
              <th>계획 비용</th>
              <th>계획 공헌이익</th>
            </tr>
          </thead>
          <tbody>
            {scenarioResults(workspace.records, participants).map((r) => (
              <tr key={r.id}>
                <td>{r.title}</td>
                <td>{r.margin?.revenueWon.toLocaleString() ?? "산출 불가"}</td>
                <td>{r.margin?.costWon.toLocaleString() ?? "산출 불가"}</td>
                <td>
                  {r.margin?.contributionWon.toLocaleString() ?? "산출 불가"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="panel-note">
        원 단위 계획값입니다. 가격/고정비/변동비 미입력 시 계산하지 않습니다.
        실제 회차 손익은 결제·지출 원장에서 집계합니다.
      </p>
    </Panel>
  );
}
export function SurveyAnalysis() {
  const { workspace } = useWorkspace();
  const rows = toOperatingData(workspace.records).surveys.filter(
    (r) => r.completed,
  );
  const counts = (key: "priceWon" | "preferredMinutes") => {
    const m = new Map<number, number>();
    for (const r of rows) {
      const value = r[key];
      if (value !== null) m.set(value, (m.get(value) ?? 0) + 1);
    }
    return [...m].sort((a, b) => a[0] - b[0]);
  };
  return (
    <Panel title={`고객조사 분석 · 완료 응답 ${rows.length}건`}>
      <p className="panel-note">
        자발적·소표본 조사입니다. 전체 시장의 확정 통계로 해석하지 않습니다.
        구매의향 {rows.filter((r) => r.purchaseIntent === true).length}건 ·
        예약문의 {rows.filter((r) => r.reservationInquiry).length}건 · 직접 참여{" "}
        {rows.filter((r) => r.preference === "participate").length}건 · 관람{" "}
        {rows.filter((r) => r.preference === "watch").length}건.
      </p>
      <div className="two-columns">
        {[
          ["priceWon", "선택 가격(원)"],
          ["preferredMinutes", "선호 시간(분)"],
        ].map(([key, label]) => (
          <div key={key}>
            <h3>{label}</h3>
            <ul className="planned-list">
              {counts(key as "priceWon" | "preferredMinutes").map(
                ([value, n]) => (
                  <li key={value}>
                    {value.toLocaleString()} · {n}건
                  </li>
                ),
              )}
            </ul>
          </div>
        ))}
      </div>
      <p className="panel-note">
        인천 방문 {rows.filter((r) => r.visitIncheon === true).length} ·
        역사문화 연계 {rows.filter((r) => r.culturalLink === true).length} ·
        추가 방문 {rows.filter((r) => r.extraVisit === true).length} · 추가 소비{" "}
        {rows.filter((r) => r.extraSpending === true).length} · 숙박{" "}
        {rows.filter((r) => r.overnight === true).length}건 (각 ‘예’ 응답).
        미응답을 부정 응답으로 처리하지 않습니다.
      </p>
    </Panel>
  );
}
