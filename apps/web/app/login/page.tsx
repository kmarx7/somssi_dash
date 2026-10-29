import Link from "next/link";
import { LoginForm } from "@/components/operations/login-form";
export const metadata = { title: "팀 계정 로그인" };
export default function Login() {
  return (
    <main className="login-page">
      <div className="login-card">
        <p className="eyebrow">SOMSSI · 2R CONTROL CENTER</p>
        <h1>팀 계정 로그인</h1>
        <p>프로젝트 멤버십과 역할에 따라 운영 기록에 접근합니다.</p>
        <LoginForm />
        <Link className="text-link" href="/overview">
          사업 개요로 돌아가기 →
        </Link>
      </div>
    </main>
  );
}
