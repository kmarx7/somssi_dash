"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Panel } from "@/components/ui";
import { useWorkspace } from "./workspace";
import { ConnectionNotice } from "./record-manager";
export function SettingsControls() {
  const { workspace, refresh } = useWorkspace();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function backup() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/backup", { cache: "no-store" });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SOMSSI-private-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage(
        "기록·감사 이력 백업을 내려받았습니다. 증빙 파일 원본은 별도 백업이 필요합니다.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "백업 실패");
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    try {
      const r = await fetch("/api/auth/logout", { method: "POST" });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error);
      await refresh();
      router.push("/login");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "로그아웃 실패");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <ConnectionNotice />
      <Panel title="계정·백업">
        <div className="task-controls">
          <button
            className="button"
            disabled={
              workspace.state !== "connected" ||
              busy ||
              !["owner", "admin"].includes(workspace.role ?? "")
            }
            onClick={() => void backup()}
          >
            운영 기록·감사 이력 JSON 백업
          </button>
          <button
            className="button"
            disabled={workspace.state !== "connected" || busy}
            onClick={() => void logout()}
          >
            로그아웃
          </button>
        </div>
        <p className="panel-note">
          백업에는 실제 입력값과 변경 이력이 포함됩니다. Git/public 외부에
          안전하게 보관하세요. 증빙 파일 바이너리는 포함하지 않습니다. 자동
          복원·기존 기록 덮어쓰기는 제공하지 않습니다.
        </p>
        {message ? <p role="status">{message}</p> : null}
      </Panel>
    </>
  );
}
