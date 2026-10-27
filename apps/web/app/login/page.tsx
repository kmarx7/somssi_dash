import Link from "next/link";
import { Badge } from "@/components/ui";
export const metadata = { title: "로그인 준비" };
export default function Login() {
  return (
    <main className="login-page">
      <div className="login-card">
        <p className="eyebrow">SOMSSI · 2R CONTROL CENTER</p>
        <Badge tone="amber">로그인 미구현 · M2 예정</Badge>
        <h1>팀의 운영 공간에 오신 것을 환영합니다.</h1>
        <p>
          초대 사용자 로그인과 프로젝트별 권한은 다음 단계에서 연결합니다.
          현재는 인증 없이 데모 화면만 둘러볼 수 있습니다.
        </p>
        <button className="button" disabled>
          팀 계정 로그인 · 준비 중
        </button>
        <Link className="button button-primary" href="/overview">
          데모 화면 둘러보기 →
        </Link>
        <small>실제 계정 정보는 입력받지 않습니다.</small>
      </div>
    </main>
  );
}
