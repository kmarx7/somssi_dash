"use client";
import { useState, type FormEvent } from "react";
import { Badge, Notice, Panel } from "@/components/ui";
import {
  domains,
  fieldsFor,
  valueLabels,
  type Field,
  type Payload,
  type StoredRecord,
} from "@/lib/operations/domains";
import { useWorkspace } from "./workspace";
import { makeCsv } from "@/lib/operations/csv";
export function ConnectionNotice() {
  const { workspace, refresh } = useWorkspace();
  if (workspace.state === "connected")
    return (
      <p className="panel-note">
        {workspace.project?.name} · 로컬 저장 · 변경 이력 기록{" "}
        <button className="text-link" onClick={() => void refresh()}>
          새로고침
        </button>
      </p>
    );
  return (
    <Notice>
      {workspace.state === "loading"
        ? "로컬 저장소를 열고 있습니다."
        : (workspace.error ?? "로컬 저장 폴더를 확인해 주세요.")}{" "}
      등록·수정은 로컬 저장소가 정상적으로 열린 후 사용할 수 있습니다.
    </Notice>
  );
}
function initialValues(kind: string): Payload {
  return Object.fromEntries(
    fieldsFor(kind).map((f) => [
      f.key,
      f.type === "boolean"
        ? false
        : f.type === "refs"
          ? []
          : f.type === "select"
            ? f.options![0]
            : f.required && f.type === "number"
              ? 0
              : null,
    ]),
  );
}
function format(value: Payload[string]): string {
  return value === null
    ? "미입력"
    : typeof value === "boolean"
      ? value
        ? "예"
        : "아니요"
      : Array.isArray(value)
        ? `${value.length}건`
        : (valueLabels[String(value)] ?? String(value));
}
export function RecordManager({ kind }: { kind: string }) {
  const { workspace, refresh } = useWorkspace();
  const domain = domains[kind];
  const [editing, setEditing] = useState<StoredRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [values, setValues] = useState<Payload>(() => initialValues(kind));
  const [recordId, setRecordId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const records = workspace.records.filter((r) => r.kind === kind);
  const filtered = records.filter(
    (r) =>
      String(r.payload.title ?? "").includes(query.trim()) &&
      (status === "all" || r.payload.verificationStatus === status),
  );
  const canWrite =
    workspace.state === "connected" &&
    workspace.role !== "viewer" &&
    (kind !== "expenseReviews" ||
      ["owner", "admin"].includes(workspace.role ?? ""));
  const visibleFields = domain.fields.slice(0, 5);
  const begin = (row: StoredRecord | null) => {
    setEditing(row);
    setCreating(!row);
    setRecordId(row?.id ?? crypto.randomUUID());
    const next = row ? { ...row.payload } : initialValues(kind);
    for (const field of fieldsFor(kind)) {
      if (field.type === "datetime" && typeof next[field.key] === "string") {
        const date = new Date(next[field.key] as string);
        if (Number.isFinite(date.getTime()))
          next[field.key] = new Date(
            date.getTime() - date.getTimezoneOffset() * 60000,
          )
            .toISOString()
            .slice(0, 16);
      }
    }
    setValues(next);
    setMessage("");
  };
  const set = (key: string, value: Payload[string]) =>
    setValues((v) => (Object.is(v[key], value) ? v : { ...v, [key]: value }));
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canWrite || !recordId || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const normalized = { ...values };
      for (const f of fieldsFor(kind))
        if (
          f.type === "datetime" &&
          typeof normalized[f.key] === "string" &&
          normalized[f.key]
        )
          normalized[f.key] = new Date(
            normalized[f.key] as string,
          ).toISOString();
      const response = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: recordId,
          kind,
          expectedVersion: editing?.version ?? 0,
          payload: normalized,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "저장하지 못했습니다.");
      setCreating(false);
      setEditing(null);
      setMessage("로컬 저장과 감사 이력 기록을 완료했습니다.");
      await refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "저장하지 못했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }
  function exportCsv() {
    const fields = fieldsFor(kind);
    const rows = [
      ["ID", "버전", ...fields.map((f) => f.label)],
      ...filtered.map((r) => [
        r.id,
        r.version,
        ...fields.map((f) => r.payload[f.key]),
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob([makeCsv(rows)], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `SOMSSI-${kind}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function control(f: Field) {
    const value = values[f.key];
    const id = `${kind}-${f.key}`;
    if (f.type === "boolean")
      return (
        <input
          id={id}
          type="checkbox"
          checked={value === true}
          onChange={(e) => set(f.key, e.target.checked)}
        />
      );
    if (f.type === "select")
      return (
        <select
          id={id}
          value={String(value ?? "")}
          onChange={(e) => set(f.key, e.target.value)}
        >
          {f.options!.map((o) => (
            <option key={o} value={o}>
              {valueLabels[o] ?? o}
            </option>
          ))}
        </select>
      );
    if (f.type === "ref" || f.type === "refs") {
      const multiple = f.type === "refs";
      return (
        <select
          id={id}
          multiple={multiple}
          required={f.required}
          value={
            multiple ? (Array.isArray(value) ? value : []) : String(value ?? "")
          }
          onChange={(e) =>
            set(
              f.key,
              multiple
                ? Array.from(e.target.selectedOptions).map((o) => o.value)
                : e.target.value || null,
            )
          }
        >
          {multiple ? null : <option value="">미선택</option>}
          {workspace.records
            .filter((r) => r.kind === f.ref)
            .map((r) => (
              <option key={r.id} value={r.id}>
                {String(r.payload.title)} · {r.id.slice(0, 8)}
              </option>
            ))}
        </select>
      );
    }
    if (f.type === "textarea")
      return (
        <textarea
          id={id}
          value={String(value ?? "")}
          maxLength={8000}
          required={f.required}
          onChange={(e) => set(f.key, e.target.value || null)}
        />
      );
    const shown = value === null ? "" : String(value);
    return (
      <input
        id={id}
        type={
          f.type === "datetime"
            ? "datetime-local"
            : f.type === "number"
              ? "number"
              : f.type === "date"
                ? "date"
                : "text"
        }
        value={shown}
        required={f.required}
        min={f.min}
        max={f.max}
        step={f.type === "number" ? 1 : undefined}
        maxLength={500}
        onChange={(e) =>
          set(
            f.key,
            e.target.value === ""
              ? null
              : f.type === "number"
                ? Number(e.target.value)
                : e.target.value,
          )
        }
      />
    );
  }
  return (
    <Panel
      title={`${domain.label} 관리`}
      meta={
        <Badge>
          {records.length}건 ·{" "}
          {workspace.state === "connected" ? "운영 데이터" : "미연결"}
        </Badge>
      }
    >
      <div className="task-controls">
        <label className="search-field">
          <span>{domain.label} 검색</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label>
          <span>검증 상태</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">전체</option>
            {["계획", "진행 중", "실증 완료", "확인 필요", "확정"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <button
          className="button"
          disabled={!canWrite || domain.uploadOnly || creating || !!editing}
          onClick={() => begin(null)}
        >
          {domain.label} 등록
        </button>
      </div>
      <button
        className="button"
        disabled={workspace.state !== "connected"}
        onClick={exportCsv}
      >
        현재 목록 CSV 내보내기
      </button>
      {kind === "expenses" ? (
        <p className="panel-note">
          원거래는 수정·삭제할 수 없습니다. 정정은 새 기록에서 원거래를 선택하고
          동일 자금·비목·거래처·회차에 증감액과 사유를 기록합니다. 정산 상태
          변경은 아래 검토에서 처리합니다.
        </p>
      ) : null}
      {kind === "payments" ? (
        <p className="panel-note">
          결제 완료 기록은 수정할 수 없습니다. 환불 처리는 아직 지원하지
          않습니다. 카드·계좌·연락처는 입력하지 마세요.
        </p>
      ) : null}
      {message ? (
        <p role="status" className="notice">
          {message}
        </p>
      ) : null}
      {creating || editing ? (
        <form className="operation-form" onSubmit={submit}>
          <h3>
            {editing
              ? `기록 수정 · 버전 ${editing.version}`
              : `${domain.label} 신규 등록`}
          </h3>
          {kind === "surveys" ? (
            <p className="panel-note">
              익명 코드만 사용합니다. 소표본 결과는 전체 시장 통계로 확정하지
              않습니다.
            </p>
          ) : null}
          <div className="operation-fields">
            {fieldsFor(kind).map((f) => (
              <div
                className={`operation-field ${f.type === "textarea" ? "field-wide" : ""}`}
                key={f.key}
              >
                <label htmlFor={`${kind}-${f.key}`}>
                  {f.label}
                  {f.required ? " *" : ""}
                </label>
                {control(f)}
                {f.type === "refs" ? (
                  <small>여러 항목은 Ctrl/Cmd를 누른 채 선택합니다.</small>
                ) : null}
              </div>
            ))}
          </div>
          <div className="task-controls">
            <button
              className="button button-primary"
              disabled={busy || !canWrite}
            >
              {busy ? "저장 중…" : "로컬에 저장"}
            </button>
            <button
              type="button"
              className="button"
              disabled={busy}
              onClick={() => {
                setEditing(null);
                setCreating(false);
                setMessage("");
              }}
            >
              닫기
            </button>
          </div>
        </form>
      ) : null}
      <div className="table-scroll">
        <table>
          <caption className="sr-only">{domain.label} 등록 목록</caption>
          <thead>
            <tr>
              {visibleFields.map((f) => (
                <th key={f.key}>{f.label}</th>
              ))}
              <th>검증 상태</th>
              <th>출처·확인일</th>
              <th>버전·작업</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                {visibleFields.map((f) => (
                  <td key={f.key} className="wrap-cell">
                    {f.type === "ref"
                      ? String(
                          workspace.records.find(
                            (t) => t.id === r.payload[f.key],
                          )?.payload.title ?? "미선택",
                        )
                      : format(r.payload[f.key])}
                  </td>
                ))}
                <td>
                  <Badge>{String(r.payload.verificationStatus)}</Badge>
                </td>
                <td className="wrap-cell">
                  {String(r.payload.source)}
                  <small>
                    {String(r.payload.checkedAt ?? "확인일 미입력")}
                  </small>
                </td>
                <td>
                  v{r.version} <small>{r.id.slice(0, 8)}</small>
                  <button
                    className="button"
                    disabled={
                      !canWrite ||
                      domain.immutable ||
                      (kind === "payments" && r.payload.status === "paid") ||
                      (workspace.role === "editor" &&
                        r.created_by !== workspace.userId)
                    }
                    onClick={() => begin(r)}
                  >
                    수정
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!filtered.length ? (
        <p className="empty-state">
          {workspace.state === "connected"
            ? "조건에 맞는 등록 기록이 없습니다."
            : "데이터 저장소 연결 후 등록한 기록이 표시됩니다."}
        </p>
      ) : null}
    </Panel>
  );
}
