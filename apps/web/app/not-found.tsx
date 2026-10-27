import Link from "next/link";
export default function NotFound() {
  return (
    <main className="login-page">
      <div className="login-card">
        <p className="eyebrow">404 · SOMSSI</p>
        <h1>페이지를 찾을 수 없습니다.</h1>
        <p>
          주소를 확인하거나 사업 개요로 이동해 주세요. 상세 데이터 화면은 아직
          구현되지 않았습니다.
        </p>
        <Link href="/overview" className="button button-primary">
          사업 개요로 이동 →
        </Link>
      </div>
    </main>
  );
}
