"use client";
import { useState } from "react";
import { demoTasks, taskStatus } from "@/data/demo/project";
import { Badge, Panel } from "./ui";
export function TaskList() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const filtered = demoTasks.filter(
    (t) =>
      (status === "all" || t.status === status) &&
      `${t.title} ${t.owner} ${t.activity}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  return (
    <Panel
      title="업무 목록"
      meta={<Badge tone="blue">데모 · 조회만 가능</Badge>}
    >
      <div className="task-controls">
        <label className="search-field">
          <span>업무 검색</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="업무명, 담당자, 활동 검색"
            type="search"
          />
        </label>
        <label className="status-field">
          <span>업무 상태</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">전체 상태</option>
            {Object.entries(taskStatus).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button
          className="button"
          onClick={() => {
            setQuery("");
            setStatus("all");
          }}
        >
          필터 초기화
        </button>
      </div>
      <p className="result-count" aria-live="polite">
        데모 업무 {filtered.length}건 / 전체 {demoTasks.length}건
      </p>
      {filtered.length ? (
        <div className="table-scroll">
          <table>
            <caption className="sr-only">데모 업무 검색 결과</caption>
            <thead>
              <tr>
                <th scope="col">업무명 / 연결 활동</th>
                <th scope="col">담당자</th>
                <th scope="col">마감일</th>
                <th scope="col">우선순위</th>
                <th scope="col">상태</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td>
                    <strong>{t.title}</strong>
                    <small>{t.activity}</small>
                  </td>
                  <td>{t.owner}</td>
                  <td>{t.due}</td>
                  <td>{t.priority}</td>
                  <td>
                    <Badge
                      tone={
                        t.status === "done"
                          ? "green"
                          : t.status === "blocked"
                            ? "amber"
                            : "blue"
                      }
                    >
                      {taskStatus[t.status]}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state" role="status">
          <strong>검색 조건에 맞는 업무가 없습니다.</strong>
          <p>다른 검색어를 입력하거나 필터를 초기화해 주세요.</p>
        </div>
      )}
      <p className="panel-note">
        검색·필터만 작동합니다. 등록·수정·상태 변경·담당자 지정·DB 저장은 M2
        예정입니다.
      </p>
    </Panel>
  );
}
