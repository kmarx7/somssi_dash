"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "./workspace";
export function LoginForm() {
  const { workspace, refresh } = useWorkspace();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = event.currentTarget;
    const fields = new FormData(form);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: fields.get("email"),
          password: fields.get("password"),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      form.reset();
      await refresh();
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "로그인에 실패했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="operation-form">
      <div className="operation-field">
        <label htmlFor="login-email">이메일</label>
        <input
          id="login-email"
          name="email"
          type="email"
          required
          autoComplete="username"
        />
      </div>
      <div className="operation-field">
        <label htmlFor="login-password">비밀번호</label>
        <input
          id="login-password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </div>
      <p className="panel-note">
        관리자가 등록한 계정만 사용합니다. 신규 가입·초대 이메일 자동 발송은
        지원하지 않습니다.
      </p>
      {message ? <p role="alert">{message}</p> : null}
      <button
        className="button button-primary"
        disabled={
          busy ||
          workspace.state === "unconfigured" ||
          workspace.state === "loading"
        }
      >
        {busy ? "로그인 중…" : "팀 계정 로그인"}
      </button>
      {workspace.state === "unconfigured" ? (
        <p role="status">저장소 연결 설정 필요 · 로그인 사용 불가</p>
      ) : null}
    </form>
  );
}
