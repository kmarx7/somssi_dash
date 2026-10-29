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
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const record = workspace.records.find((r) => r.id === id);
      a.href = url;
      a.download = String(record?.payload.originalName ?? "evidence");
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
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
            지원하지 않습니다. 파일은 이 컴퓨터의 비공개 저장 폴더에 보관됩니다.
            검증 상태는 업로드만으로 확정되지 않습니다.
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
          파일은 로컬 앱에서만 내려받으며 내려받기 전 크기와 원본 해시를
          확인합니다.
        </p>
      </Panel>
    </>
  );
}
