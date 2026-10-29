"use client";
import { useState } from "react";
import { Panel } from "@/components/ui";
import { useWorkspace } from "./workspace";
import { ConnectionNotice } from "./record-manager";
export function SettingsControls() {
  const { workspace } = useWorkspace();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function backup(files: boolean) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/backup${files ? "?files=1" : ""}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = files
        ? `SOMSSI-${new Date().toISOString().slice(0, 10)}.somssi-backup.gz`
        : `SOMSSI-local-records-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage(
        files
          ? "DB·감사 이력·증빙 원본을 포함한 전체 백업을 내려받았습니다."
          : "기록·감사 이력 JSON을 내려받았습니다. 증빙 원본은 전체 백업을 사용하세요.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "백업 실패");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <ConnectionNotice />
      <Panel title="로컬 저장 위치·백업">
        <dl className="budget-lines">
          <div>
            <dt>저장 방식</dt>
            <dd>이 컴퓨터 · SQLite</dd>
          </div>
          <div>
            <dt>운영 폴더</dt>
            <dd className="local-path">
              {workspace.storage?.directory ?? "확인 중"}
            </dd>
          </div>
          <div>
            <dt>사용자</dt>
            <dd>이 컴퓨터의 로컬 사용자</dd>
          </div>
        </dl>
        <div className="task-controls">
          <button
            className="button button-primary"
            disabled={workspace.state !== "connected" || busy}
            onClick={() => void backup(true)}
          >
            {busy ? "백업 준비 중…" : "증빙 포함 전체 백업"}
          </button>
          <button
            className="button"
            disabled={workspace.state !== "connected" || busy}
            onClick={() => void backup(false)}
          >
            기록 JSON 내보내기
          </button>
        </div>
        <p className="panel-note">
          계정·클라우드 연결 없이 이 컴퓨터에 저장합니다. 백업은 압축 파일이며
          암호화되지 않습니다. Git/public 외부에 안전하게 보관하세요. 전체
          백업은 새 폴더에 복구할 수 있고, 기존 운영 폴더를 덮어쓰지 않습니다.
          다른 컴퓨터와 자동 동기화되지 않습니다.
        </p>
        {message ? <p role="status">{message}</p> : null}
      </Panel>
    </>
  );
}
