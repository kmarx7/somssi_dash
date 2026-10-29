"use client";
import { useState, type FormEvent } from "react";
import { Panel } from "@/components/ui";
import { useWorkspace } from "./workspace";
import { ConnectionNotice } from "./record-manager";
export function EvidenceManager() {
  const { workspace, refresh } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const writable =
    workspace.state === "connected" && workspace.role !== "viewer";
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/evidence/upload", {
        method: "POST",
        body: new FormData(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      form.reset();
      setMessage("비공개 증빙과 서버 감사 이력 등록을 완료했습니다.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "업로드 실패");
    } finally {
      setBusy(false);
    }
  }
  async function download(id: string) {
    setMessage("");
    try {
      const response = await fetch(
        `/api/evidence/download?id=${encodeURIComponent(id)}`,
        { cache: "no-store" },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      window.location.assign(result.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "다운로드 실패");
    }
  }
  const records = workspace.records.filter((r) => r.kind === "evidence");
  return (
    <>
      <ConnectionNotice />
      <Panel title="비공개 증빙 업로드">
        <form className="operation-form" onSubmit={upload}>
          <div className="operation-fields">
            <div className="operation-field">
              <label htmlFor="evidence-title">증빙 제목</label>
              <input
                id="evidence-title"
                name="title"
                maxLength={500}
                required
              />
            </div>
            <div className="operation-field">
              <label htmlFor="evidence-type">증빙 유형</label>
              <select id="evidence-type" name="evidenceType">
                <option>영수증</option>
                <option>사진·영상 자료</option>
                <option>견적서</option>
                <option>협력의향서(LOI)</option>
                <option>계약서</option>
                <option>서명·참여확인</option>
                <option>기타</option>
              </select>
            </div>
            <div className="operation-field field-wide">
              <label htmlFor="evidence-file">파일 · 최대10MB</label>
              <input
                id="evidence-file"
                name="file"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx"
                required
              />
            </div>
          </div>
          <button
            className="button button-primary"
            disabled={!writable || busy}
          >
            {busy ? "업로드 중…" : "비공개 업로드"}
          </button>
          <p className="panel-note">
            서명·연락처 등 필요한 최소 정보만 업로드하세요. 동영상은 현재
            지원하지 않습니다. 편집자는 본인 업로드 파일, 관리자는 프로젝트
            파일을 내려받을 수 있습니다. 검증 상태는 업로드만으로 확정되지
            않습니다.
          </p>
        </form>
        {message ? (
          <p className="notice" role="status">
            {message}
          </p>
        ) : null}
      </Panel>
      <Panel title={`등록 증빙 ${records.length}건`}>
        <ul className="planned-list">
          {records.map((r) => (
            <li key={r.id}>
              <div>
                <strong>{String(r.payload.title)}</strong>
                <small>
                  {" "}
                  · {String(r.payload.evidenceType)} ·{" "}
                  {(Number(r.payload.size) / 1024).toFixed(1)}KB
                </small>
              </div>
              <button
                className="button"
                disabled={
                  workspace.role === "viewer" ||
                  (workspace.role === "editor" &&
                    r.created_by !== workspace.userId)
                }
                onClick={() => void download(r.id)}
              >
                파일 받기
              </button>
            </li>
          ))}
        </ul>
        <p className="panel-note">
          업로드 후 업무·회차·지출 검토 등의 ‘연결 증빙’에서 선택해 주세요.
          다운로드 링크는 권한 확인 후 60초 동안만 유효합니다.
        </p>
      </Panel>
    </>
  );
}
