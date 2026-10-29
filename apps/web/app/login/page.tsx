import Link from "next/link";
export const metadata = { title: "로컬 저장 모드" };
export default function Login() {
  return (
    <main className="login-page">
      <div className="login-card">
        <p className="eyebrow">SOMSSI · LOCAL WORKSPACE</p>
        <h1>로컬 저장 모드</h1>
        <p>
          계정 로그인이나 Supabase 연결 없이 이 컴퓨터에 데이터를 저장합니다. 이
          컴퓨터에 접근할 수 있는 사용자가 같은 운영 기록을 사용합니다.
        </p>
        <Link className="button button-primary" href="/dashboard">
          대시보드 열기 →
        </Link>
        <Link className="text-link" href="/settings">
          저장 위치·백업 확인 →
        </Link>
      </div>
    </main>
  );
}
