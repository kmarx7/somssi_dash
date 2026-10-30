"use client";
import { useRef, useState, type CSSProperties, type FormEvent } from "react";
import Link from "next/link";
import { PageHeader, Panel, Notice, Badge } from "@/components/ui";
import { ConnectionNotice } from "@/components/operations/record-manager";
import { useWorkspace } from "@/components/operations/workspace";
import { domains, type Payload } from "@/lib/operations/domains";
import {
  calendarColors,
  calendarEntries,
  emptyCalendarEvent,
  koreaDay,
  monthDays,
  moveMonth,
  onDay,
  type CalendarEntry,
} from "@/lib/operations/calendar";
import {
  schedulePlanChanges,
  schedulePlan,
} from "@/data/reference/schedule-plan";
const categories = domains.calendarEvents.fields.find(
  (f) => f.key === "category",
)!.options!;
const statuses = ["계획", "진행 중", "완료", "취소"];
const colorStyle = (color: string): CSSProperties =>
  ({
    "--event-color":
      calendarColors.find((c) => c.id === color)?.hex ?? "#59677e",
  }) as CSSProperties;
type Draft = { id: string; version: number; payload: Payload };
async function saveRecord(draft: Draft) {
  const response = await fetch("/api/records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: "calendarEvents",
      id: draft.id,
      expectedVersion: draft.version,
      payload: draft.payload,
    }),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error ?? "일정을 저장하지 못했습니다.");
}
export function ScheduleCalendar() {
  const { workspace, refresh } = useWorkspace();
  const [month, setMonth] = useState("2026-11");
  const [selected, setSelected] = useState("2026-11-01");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const editor = useRef<HTMLDivElement>(null);
  const ready = workspace.state === "connected";
  const entries = calendarEntries(workspace.records);
  const filtered = entries.filter(
    (e) =>
      (!category || e.category === category) &&
      (!status || e.status === status),
  );
  const days = monthDays(month);
  const dayEntries = filtered.filter((e) => onDay(e, selected));
  const pending = schedulePlanChanges(workspace.records);
  function open(day: string, entry?: CalendarEntry) {
    setSelected(day);
    setError("");
    setMessage("");
    setDraft(
      entry
        ? {
            id: entry.id,
            version: entry.record.version,
            payload: { ...entry.record.payload },
          }
        : {
            id: crypto.randomUUID(),
            version: 0,
            payload: emptyCalendarEvent(day),
          },
    );
    requestAnimationFrame(() => {
      editor.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      editor.current
        ?.querySelector<HTMLInputElement>("input[name=title]")
        ?.focus({ preventScroll: true });
    });
  }
  function field(key: string, value: Payload[string]) {
    setDraft((d) =>
      d ? { ...d, payload: { ...d.payload, [key]: value } } : d,
    );
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft || busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await saveRecord(draft);
      await refresh();
      setSelected(String(draft.payload.startDate));
      setMonth(String(draft.payload.startDate).slice(0, 7));
      setDraft(null);
      setMessage("일정을 로컬에 저장했습니다.");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "저장 실패. 입력 내용은 유지됩니다.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function installPlan() {
    setBusy(true);
    setError("");
    setMessage("");
    let added = 0;
    try {
      // Individual audited writes; refresh before retry skips already saved IDs and never overwrites edits.
      const response = await fetch("/api/workspace", { cache: "no-store" });
      if (!response.ok) throw new Error("저장 상태를 확인하지 못했습니다.");
      const current = await response.json();
      for (const row of schedulePlanChanges(current.records)) {
        await saveRecord(row);
        added++;
      }
      setMessage(
        `사업계획 기준 ${added}개 일정을 반영했습니다. 날짜·담당자·색상을 실제 수행 계획에 맞게 수정하세요.`,
      );
    } catch (e) {
      setError(
        `${added}개 저장 후 중단했습니다. ${e instanceof Error ? e.message : "저장 실패"} 다시 반영하면 미반영 항목만 이어서 처리합니다.`,
      );
    } finally {
      await refresh();
      setBusy(false);
    }
  }
  const p = draft?.payload;
  return (
    <>
      <PageHeader
        eyebrow="SOMSSI · EXECUTION CALENDAR"
        title="실행 일정"
        description="거쳐 가는 인천 → 찾아와 머무는 인천. 검증 활동부터 11월 23일 제출까지 상세 일정을 관리합니다."
        action={
          <button
            className="button button-primary"
            disabled={!ready || busy}
            onClick={() => open(selected)}
          >
            + 일정 추가
          </button>
        }
      />
      <ConnectionNotice />
      <div className="schedule-plan-note">
        <div>
          <strong>2R 사업계획 기반 일정 · {schedulePlan.length}개</strong>
          <p>
            최종종합본 Q1–Q4의 검증 목표·산출물을 대조했습니다(2026.10.30). 세부
            운영 날짜는 문서에 명시되지 않아 사용자 초기 계획을 유지합니다.
            목표·가격은 검증 전 가설이며 모든 일정은 수정 가능합니다.
            한국시간(KST) 기준입니다.
          </p>
        </div>
        {pending.length > 0 ? (
          <button
            className="button"
            disabled={!ready || busy}
            onClick={() => void installPlan()}
          >
            사업계획 기준 {pending.length}개 반영
          </button>
        ) : (
          <Badge tone="blue">사업계획 반영됨</Badge>
        )}
      </div>
      {message && (
        <p className="schedule-feedback" role="status">
          {message}
        </p>
      )}
      {error && (
        <div role="alert">
          <Notice>{error}</Notice>
        </div>
      )}
      <Panel
        title="상세 일정 달력"
        meta={<span className="panel-note">제출 마감 2026.11.23 14:00</span>}
      >
        <div className="calendar-toolbar">
          <div className="calendar-month">
            <button
              className="button"
              aria-label="이전 달"
              disabled={busy}
              onClick={() => setMonth(moveMonth(month, -1))}
            >
              ‹
            </button>
            <h3>
              {month.slice(0, 4)}년 {Number(month.slice(5))}월
            </h3>
            <button
              className="button"
              aria-label="다음 달"
              disabled={busy}
              onClick={() => setMonth(moveMonth(month, 1))}
            >
              ›
            </button>
            <button
              className="button"
              onClick={() => {
                const today = koreaDay();
                setMonth(today.slice(0, 7));
                setSelected(today);
              }}
            >
              오늘
            </button>
          </div>
          <div className="calendar-filters">
            <label>
              분류
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">전체 분류</option>
                {[...categories, "기존 업무", "기존 마일스톤"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              상태
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">전체 상태</option>
                {[...statuses, "지연", "확정"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <p className="panel-note">
          날짜를 누르면 상세 목록이 표시됩니다. 일정 이름을 누르면 수정할 수
          있습니다. 여러 날 일정은 기간 내 매일 표시됩니다.
        </p>
        <div className="calendar-weekdays" aria-hidden="true">
          {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="calendar-grid" aria-label={`${month} 월간 일정`}>
          {days.map((day) => {
            const items = filtered.filter((e) => onDay(e, day));
            return (
              <div
                key={day}
                className={`calendar-day ${day.slice(0, 7) !== month ? "outside-month" : ""} ${day === selected ? "selected-day" : ""} ${day === koreaDay() ? "today-day" : ""}`}
              >
                <div className="calendar-day-heading">
                  <button
                    aria-label={`${day} 상세 일정 보기`}
                    aria-pressed={day === selected}
                    onClick={() => setSelected(day)}
                  >
                    {Number(day.slice(8))}
                    {day === koreaDay() && (
                      <span className="sr-only"> 오늘</span>
                    )}
                  </button>
                  <button
                    className="calendar-add"
                    aria-label={`${day} 일정 추가`}
                    disabled={!ready || busy}
                    onClick={() => open(day)}
                  >
                    +
                  </button>
                </div>
                {items.slice(0, 3).map((e) => (
                  <button
                    key={e.id}
                    className={`calendar-chip ${e.status === "취소" ? "cancelled" : ""}`}
                    style={colorStyle(e.color)}
                    title={`${e.title} · ${e.time} · ${e.status}`}
                    onClick={() => {
                      if (e.editable && !busy && ready) open(day, e);
                      else setSelected(day);
                    }}
                  >
                    {e.title}
                  </button>
                ))}
                {items.length > 3 && (
                  <button
                    className="calendar-more"
                    onClick={() => setSelected(day)}
                  >
                    +{items.length - 3}개 더 보기
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <p className="panel-note">
          색상은 자유롭게 지정합니다. 분류·상태는 각 일정의 상세 목록에서 별도로
          확인할 수 있습니다.
        </p>
      </Panel>
      <div className="schedule-detail-grid">
        <Panel
          title={`${selected.replaceAll("-", ".")} 상세 일정`}
          meta={
            <button
              className="text-link"
              disabled={!ready || busy}
              onClick={() => open(selected)}
            >
              + 항목 추가
            </button>
          }
        >
          {dayEntries.length === 0 ? (
            <p className="empty-state">
              선택한 조건에 해당하는 일정이 없습니다. 항목을 추가해 보세요.
            </p>
          ) : (
            <ul className="schedule-agenda">
              {dayEntries.map((e) => (
                <li
                  key={e.id}
                  style={colorStyle(e.color)}
                  className={e.status === "취소" ? "cancelled" : ""}
                >
                  <div className="schedule-agenda-title">
                    <strong>{e.title}</strong>
                    <Badge>{e.status}</Badge>
                  </div>
                  <p>
                    {e.start} ~ {e.end} · {e.time} · {e.category}
                  </p>
                  {e.record.payload.description && (
                    <p className="schedule-description">
                      {String(e.record.payload.description)}
                    </p>
                  )}
                  <p className="panel-note">
                    담당:{" "}
                    {String(
                      workspace.records.find(
                        (r) => r.id === e.record.payload.ownerId,
                      )?.payload.title ?? "미지정",
                    )}{" "}
                    · 출처: {String(e.record.payload.source)} · 확인일:{" "}
                    {String(e.record.payload.checkedAt ?? "미입력")}
                  </p>
                  {e.editable ? (
                    <button
                      className="text-link"
                      disabled={busy || !ready}
                      onClick={() => open(selected, e)}
                    >
                      일정 수정
                    </button>
                  ) : (
                    <Link className="text-link" href="/tasks">
                      기존 업무·마일스톤에서 수정
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <div ref={editor} className="schedule-editor">
          <Panel
            title={
              draft
                ? draft.version
                  ? "일정 수정"
                  : "새 일정 추가"
                : "일정 입력"
            }
          >
            {!draft || !p ? (
              <div className="schedule-editor-empty">
                <span aria-hidden="true">＋</span>
                <p>
                  달력의 + 버튼이나 ‘일정 추가’를 눌러
                  <br />새 항목을 입력하세요.
                </p>
                <p className="panel-note">
                  색상 · 기간 · 시간 · 담당자 · 관련 업무
                </p>
              </div>
            ) : (
              <form onSubmit={(e) => void submit(e)} className="schedule-form">
                <fieldset disabled={busy || !ready}>
                  <div className="operation-fields">
                    <div className="operation-field field-wide">
                      <label htmlFor="schedule-title">일정 이름 *</label>
                      <input
                        autoComplete="off"
                        id="schedule-title"
                        name="title"
                        required
                        maxLength={500}
                        value={String(p.title)}
                        onChange={(e) => field("title", e.target.value)}
                      />
                    </div>
                    <div className="operation-field">
                      <label htmlFor="schedule-start">시작일 *</label>
                      <input
                        id="schedule-start"
                        type="date"
                        required
                        value={String(p.startDate)}
                        onChange={(e) =>
                          setDraft((d) =>
                            d
                              ? {
                                  ...d,
                                  payload: {
                                    ...d.payload,
                                    startDate: e.target.value,
                                    endDate:
                                      String(d.payload.endDate) < e.target.value
                                        ? e.target.value
                                        : d.payload.endDate,
                                  },
                                }
                              : d,
                          )
                        }
                      />
                    </div>
                    <div className="operation-field">
                      <label htmlFor="schedule-end">종료일 *</label>
                      <input
                        id="schedule-end"
                        type="date"
                        required
                        min={String(p.startDate)}
                        value={String(p.endDate)}
                        onChange={(e) => field("endDate", e.target.value)}
                      />
                    </div>
                    <label className="schedule-check field-wide">
                      <input
                        type="checkbox"
                        checked={Boolean(p.allDay)}
                        onChange={(e) =>
                          setDraft((d) =>
                            d
                              ? {
                                  ...d,
                                  payload: {
                                    ...d.payload,
                                    allDay: e.target.checked,
                                    startTime: e.target.checked
                                      ? null
                                      : "09:00",
                                    endTime: e.target.checked ? null : "10:00",
                                  },
                                }
                              : d,
                          )
                        }
                      />
                      종일 일정
                    </label>
                    {!p.allDay &&
                      ["startTime", "endTime"].map((key, i) => (
                        <div className="operation-field" key={key}>
                          <label htmlFor={`schedule-${key}`}>
                            {i ? "종료 시간" : "시작 시간"} (KST) *
                          </label>
                          <input
                            id={`schedule-${key}`}
                            type="time"
                            required
                            value={String(p[key] ?? "")}
                            onChange={(e) => field(key, e.target.value)}
                          />
                        </div>
                      ))}
                    <div className="operation-field">
                      <label htmlFor="schedule-category">분류</label>
                      <select
                        id="schedule-category"
                        value={String(p.category)}
                        onChange={(e) => field("category", e.target.value)}
                      >
                        {categories.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div className="operation-field">
                      <label htmlFor="schedule-status">일정 상태</label>
                      <select
                        id="schedule-status"
                        value={String(p.status)}
                        onChange={(e) => field("status", e.target.value)}
                      >
                        {statuses.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <fieldset className="calendar-color-field field-wide">
                      <legend>일정 색상</legend>
                      <div className="calendar-swatches">
                        {calendarColors.map((c) => (
                          <label
                            key={c.id}
                            style={colorStyle(c.id)}
                            className={p.color === c.id ? "chosen" : ""}
                          >
                            <input
                              type="radio"
                              name="event-color"
                              value={c.id}
                              checked={p.color === c.id}
                              onChange={() => field("color", c.id)}
                            />
                            <span aria-hidden="true" />
                            {c.label}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    {[
                      ["ownerId", "담당자", "people"],
                      ["taskId", "연결 업무", "tasks"],
                      ["hypothesisId", "관련 가설", "hypotheses"],
                    ].map(([key, label, kind]) => (
                      <div className="operation-field" key={key}>
                        <label htmlFor={`schedule-${key}`}>{label}</label>
                        <select
                          id={`schedule-${key}`}
                          value={String(p[key] ?? "")}
                          onChange={(e) => field(key, e.target.value || null)}
                        >
                          <option value="">미지정</option>
                          {workspace.records
                            .filter((r) => r.kind === kind)
                            .map((r) => (
                              <option key={r.id} value={r.id}>
                                {String(r.payload.title)}
                              </option>
                            ))}
                        </select>
                      </div>
                    ))}
                    <div className="operation-field field-wide">
                      <label htmlFor="schedule-description">
                        세부 내용·산출물
                      </label>
                      <textarea
                        id="schedule-description"
                        maxLength={8000}
                        value={String(p.description ?? "")}
                        onChange={(e) =>
                          field("description", e.target.value || null)
                        }
                      />
                    </div>
                    <div className="operation-field field-wide">
                      <label htmlFor="schedule-source">출처 *</label>
                      <input
                        id="schedule-source"
                        required
                        maxLength={500}
                        value={String(p.source)}
                        onChange={(e) => field("source", e.target.value)}
                      />
                    </div>
                    <div className="operation-field">
                      <label htmlFor="schedule-checked">내용 확인일</label>
                      <input
                        id="schedule-checked"
                        type="date"
                        value={String(p.checkedAt ?? "")}
                        onChange={(e) =>
                          field("checkedAt", e.target.value || null)
                        }
                      />
                    </div>
                    <div className="operation-field">
                      <label htmlFor="schedule-verification">
                        자료 검증 상태
                      </label>
                      <select
                        id="schedule-verification"
                        value={String(p.verificationStatus)}
                        onChange={(e) =>
                          field("verificationStatus", e.target.value)
                        }
                      >
                        {[
                          "계획",
                          "진행 중",
                          "실증 완료",
                          "확인 필요",
                          "확정",
                        ].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <p className="panel-note">
                    저장·수정은 로컬 변경 이력에 기록됩니다. 불필요한 일정은
                    ‘취소’로 변경하세요. 일정 완료는 실제 파일럿·매출·제출
                    완료를 자동 생성하지 않습니다.
                  </p>
                  <div className="calendar-form-actions">
                    <button className="button button-primary" type="submit">
                      {busy ? "저장 중…" : "일정 저장"}
                    </button>
                    <button
                      className="button"
                      type="button"
                      onClick={() => setDraft(null)}
                    >
                      닫기
                    </button>
                  </div>
                </fieldset>
              </form>
            )}
          </Panel>
        </div>
      </div>
      <details className="schedule-original">
        <summary>이전 실행 일정 원본 참고</summary>
        <p>
          이전 앱의 일정은 자동으로 가져오지 않습니다. 원본은 별도 참고용으로
          유지합니다.
        </p>
        <a
          className="text-link"
          href="https://moonlit-rugelach-64f4b6.netlify.app/"
          target="_blank"
          rel="noopener noreferrer"
        >
          이전 원본 앱 열기 (새 창)
        </a>
      </details>
    </>
  );
}
