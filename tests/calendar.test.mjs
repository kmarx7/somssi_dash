import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  calendarEntries,
  emptyCalendarEvent,
  koreaDay,
  monthDays,
  moveMonth,
  onDay,
} from "../apps/web/lib/operations/calendar.ts";
import { validatePayload } from "../apps/web/lib/operations/validation.ts";
import {
  schedulePlan,
  missingSchedulePlan,
} from "../apps/web/data/reference/schedule-plan.ts";
import { LocalStore } from "../apps/web/lib/local/store.ts";
import { toOperatingData } from "../apps/web/lib/operations/projection.ts";
import { summarize } from "../apps/web/lib/v2/metrics.ts";
test("month grids cover all days, leap years and year boundaries without timezone drift", () => {
  const november = monthDays("2026-11");
  assert.equal(november.length, 42);
  assert.equal(november[0], "2026-11-01");
  assert.equal(november[41], "2026-12-12");
  assert.ok(monthDays("2028-02").includes("2028-02-29"));
  assert.equal(moveMonth("2026-12", 1), "2027-01");
  assert.equal(moveMonth("2026-01", -1), "2025-12");
  assert.equal(koreaDay(new Date("2026-10-31T16:00Z")), "2026-11-01");
});
test("calendar validation rejects invalid dates, reversed spans, time errors and unsafe colors", () => {
  const base = { ...emptyCalendarEvent("2026-11-01"), title: "planned event" };
  assert.equal(validatePayload("calendarEvents", base).allDay, true);
  for (const changes of [
    { endDate: "2026-10-30" },
    { startDate: "2026-02-30" },
    { startTime: "12:00" },
    { color: "url(evil)" },
    { allDay: false },
    { allDay: false, startTime: "24:00", endTime: "25:00" },
    { allDay: false, startTime: "14:00", endTime: "13:59" },
  ]) {
    assert.throws(() =>
      validatePayload("calendarEvents", { ...base, ...changes }),
    );
  }
  assert.doesNotThrow(() =>
    validatePayload("calendarEvents", {
      ...base,
      allDay: false,
      startTime: "14:00",
      endTime: "14:00",
    }),
  );
  assert.doesNotThrow(() =>
    validatePayload("calendarEvents", {
      ...base,
      endDate: "2026-11-02",
      allDay: false,
      startTime: "23:00",
      endTime: "01:00",
    }),
  );
});
test("initial plan installs resumably; edits persist with audit and plans never create actual results", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "somssi-calendar-"));
  let store = new LocalStore(dir);
  try {
    for (const row of schedulePlan.slice(0, 5))
      store.write("calendarEvents", row.id, row.payload, 0);
    assert.equal(missingSchedulePlan(store.list().map((r) => r.id)).length, 14);
    const original = store.get(schedulePlan[0].id);
    const updated = {
      ...original.payload,
      title: "changed",
      startDate: "2026-11-01",
      endDate: "2026-11-02",
      color: "rose",
      status: "진행 중",
    };
    store.write("calendarEvents", original.id, updated, original.version);
    for (const row of missingSchedulePlan(store.list().map((r) => r.id)))
      store.write("calendarEvents", row.id, row.payload, 0);
    assert.equal(store.list().length, 19);
    assert.equal(missingSchedulePlan(store.list().map((r) => r.id)).length, 0);
    assert.equal(store.get(original.id).payload.title, "changed");
    assert.equal(store.audits().length, 20);
    assert.equal(
      store.audits().find((a) => a.before_value)?.before_value.payload.color,
      "teal",
    );
    assert.throws(
      () => store.write("calendarEvents", original.id, updated, 1),
      (e) => e.status === 409,
    );
    const entries = calendarEntries(store.list());
    const first = entries.find((e) => e.id === original.id);
    assert.equal(onDay(first, "2026-11-01"), true);
    assert.equal(onDay(first, "2026-11-02"), true);
    assert.equal(onDay(first, "2026-11-03"), false);
    const deadline = entries.find((e) => e.start === "2026-11-23");
    assert.equal(deadline.time, "14:00–14:00");
    const stats = summarize(
      toOperatingData(store.list()),
      store.project.id,
      new Date(),
    );
    assert.equal(stats.revenueWon, 0);
    assert.equal(stats.spentWon, 0);
    store.close();
    store = new LocalStore(dir);
    assert.equal(store.get(original.id).payload.color, "rose");
    assert.equal(store.get(original.id).version, 2);
    store.write(
      "calendarEvents",
      original.id,
      { ...updated, status: "취소" },
      2,
    );
    assert.equal(store.list().length, 19);
    assert.equal(store.audits().length, 21);
  } finally {
    store.close();
    await rm(dir, { recursive: true, force: true });
  }
});
test("old tasks use Korea dates and milestones remain visible without migration", () => {
  const record = (kind, payload) => ({ id: randomUUID(), kind, payload });
  const entries = calendarEntries([
    record("tasks", {
      title: "old task",
      dueAt: "2026-10-31T16:00:00Z",
      status: "todo",
    }),
    record("milestones", {
      title: "old milestone",
      start: "2026-10-28",
      end: "2026-11-03",
      status: "계획",
    }),
    record("products", { title: "not an event" }),
  ]);
  assert.equal(entries.length, 2);
  assert.equal(entries.find((e) => e.title === "old task").start, "2026-11-01");
  assert.equal(
    entries.every((e) => !e.editable),
    true,
  );
  assert.equal(entries.filter((e) => onDay(e, "2026-11-01")).length, 2);
});
