import type { Payload, StoredRecord } from "./domains.ts";
export const calendarColors = [
  { id: "blue", label: "파랑", hex: "#4158c8" },
  { id: "teal", label: "청록", hex: "#117c83" },
  { id: "green", label: "초록", hex: "#347447" },
  { id: "amber", label: "황금", hex: "#996314" },
  { id: "rose", label: "분홍", hex: "#b2456b" },
  { id: "violet", label: "보라", hex: "#7851af" },
  { id: "red", label: "빨강", hex: "#bb3d3d" },
  { id: "slate", label: "회색", hex: "#59677e" },
] as const;
export function koreaDay(date = new Date()) {
  return new Date(date.getTime() + 9 * 3600000).toISOString().slice(0, 10);
}
export function monthDays(month: string): string[] {
  const first = new Date(`${month}-01T00:00:00Z`);
  first.setUTCDate(1 - first.getUTCDay());
  return Array.from({ length: 42 }, (_, n) => {
    const date = new Date(first);
    date.setUTCDate(first.getUTCDate() + n);
    return date.toISOString().slice(0, 10);
  });
}
export function moveMonth(month: string, amount: number) {
  const date = new Date(`${month}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return date.toISOString().slice(0, 7);
}
export type CalendarEntry = {
  id: string;
  title: string;
  start: string;
  end: string;
  color: string;
  category: string;
  status: string;
  time: string;
  record: StoredRecord;
  editable: boolean;
};
export function calendarEntries(
  records: readonly StoredRecord[],
): CalendarEntry[] {
  return records
    .flatMap((r): CalendarEntry[] => {
      const p = r.payload;
      if (r.kind === "calendarEvents")
        return [
          {
            id: r.id,
            title: String(p.title),
            start: String(p.startDate),
            end: String(p.endDate),
            color: String(p.color),
            category: String(p.category),
            status: String(p.status),
            time: p.allDay ? "종일" : `${p.startTime}–${p.endTime}`,
            record: r,
            editable: true,
          },
        ];
      if (r.kind === "tasks") {
        const day = koreaDay(new Date(String(p.dueAt)));
        return [
          {
            id: r.id,
            title: String(p.title),
            start: day,
            end: day,
            color: "slate",
            category: "기존 업무",
            status:
              {
                todo: "계획",
                in_progress: "진행 중",
                blocked: "지연",
                done: "완료",
              }[String(p.status)] ?? String(p.status),
            time: "업무 기한",
            record: r,
            editable: false,
          },
        ];
      }
      if (r.kind === "milestones")
        return [
          {
            id: r.id,
            title: String(p.title),
            start: String(p.start),
            end: String(p.end),
            color: "slate",
            category: "기존 마일스톤",
            status: String(p.status),
            time: "종일",
            record: r,
            editable: false,
          },
        ];
      return [];
    })
    .sort(
      (a, b) =>
        a.start.localeCompare(b.start) ||
        a.time.localeCompare(b.time) ||
        a.title.localeCompare(b.title, "ko"),
    );
}
export const onDay = (entry: CalendarEntry, day: string) =>
  entry.start <= day && entry.end >= day;
export function emptyCalendarEvent(day: string): Payload {
  return {
    title: "",
    startDate: day,
    endDate: day,
    allDay: true,
    startTime: null,
    endTime: null,
    category: "기타",
    color: "blue",
    status: "계획",
    description: null,
    ownerId: null,
    taskId: null,
    hypothesisId: null,
    source: "사용자 입력",
    checkedAt: koreaDay(),
    verificationStatus: "계획",
    evidenceIds: [],
  };
}
