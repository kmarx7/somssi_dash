"use client";
import { useEffect, useState } from "react";
import { Panel, Notice, Badge } from "@/components/ui";
import { useWorkspace } from "@/components/operations/workspace";
import { RecordManager } from "@/components/operations/record-manager";
import type { GenerationManifest } from "@/lib/documents/service";
import type { StoredRecord } from "@/lib/operations/domains";
import { documentDownloadName } from "@/lib/documents/filenames";
type Status = {
  ready: boolean;
  error?: string;
  jobs: {
    record: StoredRecord;
    manifest?: GenerationManifest;
    error?: string;
  }[];
};
async function load(signal?: AbortSignal): Promise<Status> {
  const r = await fetch("/api/documents", { cache: "no-store", signal });
  if (!r.ok) throw new Error("문서 상태를 확인하지 못했습니다");
  return r.json();
}
export function DocumentCenter() {
  const { workspace, refresh } = useWorkspace();
  const [status, setStatus] = useState<Status | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const drafts = workspace.records.filter(
    (r) => r.kind === "documentDrafts" && r.payload.state !== "보관",
  );
  useEffect(() => {
    const c = new AbortController();
    void load(c.signal)
      .then((data) => {
        if (!c.signal.aborted) setStatus(data);
      })
      .catch(() => {
        if (!c.signal.aborted)
          setStatus({
            ready: false,
            error: "문서 상태를 확인하지 못했습니다",
            jobs: [],
          });
      });
    return () => c.abort();
  }, []);
  async function generate() {
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch("/api/documents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftIds: selected }),
      });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error ?? "생성 실패");
      setStatus(await load());
      await refresh();
      setMessage(
        "원본 양식 복제·데이터 입력·구조 및 렌더 검사를 마쳤습니다. 검토사항을 확인하고 내려받으세요.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "문서를 생성하지 못했습니다");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div id="document-inputs">
      <Panel
        title="원본 양식 자동 작성"
        meta={
          <Badge tone={status?.ready ? "blue" : "amber"}>
            {status?.ready ? "로컬 작성 가능" : "준비 상태 확인"}
          </Badge>
        }
      >
        {!status?.ready && (
          <Notice>
            {status?.error ?? "로컬 원본·런타임 준비 상태를 확인하고 있습니다."}
          </Notice>
        )}
        <p className="panel-note">
          일정은 근거로 연결하고 금액은 선택한 실제 지출에서 계산합니다.
          거래명세·견적만 있는 금액은 지출 합계에 넣지 않습니다. 회의
          내용·참석자·시간·정산 적격성과 사진·서명은 확인 후 제출하세요.
        </p>
        <div className="document-draft-list">
          {drafts.map((r) => (
            <label key={r.id}>
              <input
                type="checkbox"
                disabled={busy}
                checked={selected.includes(r.id)}
                onChange={(e) =>
                  setSelected((a) =>
                    e.target.checked
                      ? [...a, r.id]
                      : a.filter((id) => id !== r.id),
                  )
                }
              />
              <span>
                <strong>{String(r.payload.title)}</strong>
                <small>
                  {String(r.payload.template)} ·{" "}
                  {String(r.payload.date ?? "날짜 미입력")} · v{r.version} ·{" "}
                  {String(r.payload.verificationStatus)}
                </small>
              </span>
            </label>
          ))}
        </div>
        {!drafts.length && (
          <p className="empty-state">
            아래 입력 초안에서 원본 양식과 연결 지출을 등록하세요.
          </p>
        )}
        <div className="calendar-form-actions">
          <button
            className="button"
            disabled={busy || drafts.length === 0 || drafts.length > 12}
            onClick={() => setSelected(drafts.map((r) => r.id))}
          >
            모두 선택
          </button>
          <button
            className="button button-primary"
            disabled={
              busy ||
              !status?.ready ||
              workspace.state !== "connected" ||
              selected.length === 0 ||
              selected.length > 12
            }
            onClick={() => void generate()}
          >
            {busy
              ? "문서 입력·렌더 검사 중…"
              : `선택한 ${selected.length}건 작성 (검토용)`}
          </button>
        </div>
        {message && (
          <p role="status" className="panel-note">
            {message}
          </p>
        )}
      </Panel>
      <RecordManager kind="documentDrafts" />
      <Panel
        title="작성 결과·다운로드"
        meta={<Badge>모든 결과는 제출 전 검토 필요</Badge>}
      >
        {!status?.jobs.length && (
          <p className="empty-state">작성한 문서가 없습니다.</p>
        )}
        {status?.jobs.map((job) => (
          <article className="generated-job" key={job.record.id}>
            <h3>
              {String(job.record.payload.title)}{" "}
              <Badge>{String(job.record.payload.status)}</Badge>
            </h3>
            {job.error ? (
              <Notice>{job.error}</Notice>
            ) : (
              <>
                <ul className="planned-list">
                  {job.manifest?.files.map((file) => (
                    <li key={file.filename}>
                      <a
                        className="text-link"
                        download={documentDownloadName(file)}
                        href={`/api/documents/download?job=${encodeURIComponent(String(job.record.payload.jobId))}&file=${encodeURIComponent(file.filename)}`}
                      >
                        {file.title} ·{" "}
                        {file.filename.split(".").pop()?.toUpperCase()}
                      </a>
                      <small>
                        {file.pages === null ? "" : `${file.pages}쪽 · `}
                        {(file.size / 1024).toFixed(0)} KB
                        {" · "}
                        {documentDownloadName(file)}
                      </small>
                    </li>
                  ))}
                </ul>
                <details>
                  <summary>미입력·검토사항</summary>
                  <ul>
                    {job.manifest?.warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                  <p className="panel-note">
                    생성 시점 데이터·원본 해시·결과 해시를 보관합니다. 구조/렌더
                    검사는 서명·사실관계 확인이나 정산 승인이 아닙니다.
                  </p>
                </details>
              </>
            )}
          </article>
        ))}
      </Panel>
    </div>
  );
}
