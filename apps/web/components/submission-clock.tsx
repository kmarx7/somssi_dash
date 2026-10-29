"use client";
import { useEffect, useState } from "react";
import { deadlineRemaining } from "@/lib/v2/metrics";
import { v2Reference } from "@/data/reference/v2";
export function SubmissionClock({
  deadline = v2Reference.deadline,
}: {
  deadline?: string;
}) {
  const [remaining, setRemaining] = useState<ReturnType<
    typeof deadlineRemaining
  > | null>(null);
  useEffect(() => {
    const update = () => setRemaining(deadlineRemaining(deadline, new Date()));
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, [deadline]);
  return (
    <strong>
      {remaining === null
        ? "확인 중"
        : remaining.expired
          ? "마감 도달"
          : `${remaining.days}일 ${remaining.hours}시간`}
    </strong>
  );
}
