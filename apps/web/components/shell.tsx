"use client";
import Link from "next/link";
import { useWorkspace } from "./operations/workspace";
import { usePathname } from "next/navigation";
import { navigation, allItems } from "@/lib/navigation";
import { Icon } from "./icon";
import { Badge } from "./ui";
import type { ReactNode, MouseEvent } from "react";
function Navigation() {
  const pathname = usePathname();
  function closeMenu(event: MouseEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest("a")) {
      const details = event.currentTarget.closest("details");
      if (details) details.open = false;
    }
  }
  return (
    <nav aria-label="주 메뉴" onClick={closeMenu}>
      {navigation.map((group) => (
        <div className="nav-group" key={group.group}>
          <p className="nav-label">{group.group}</p>
          {group.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={
                pathname === item.href || pathname.startsWith(item.href + "/")
                  ? "page"
                  : undefined
              }
              className="nav-link"
            >
              <Icon name={item.icon} />
              <span>{item.title}</span>
              {item.href === "/budget/allocate" ? (
                <Icon name="external" size={12} />
              ) : null}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
function Brand() {
  return (
    <Link href="/overview" className="brand" aria-label="SOMSSI 사업 개요">
      SOMSSI<span>.</span>
      <small>2R CONTROL CENTER</small>
    </Link>
  );
}
export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const demo = path === "/tasks/demo" || path === "/dashboard/demo";
  const { workspace } = useWorkspace();
  const connected = workspace.state === "connected";
  const connectionLabel = connected
    ? "로컬 저장"
    : workspace.state === "signed_out"
      ? "로컬 저장 확인"
      : workspace.state === "loading"
        ? "로컬 저장 확인 중"
        : "로컬 저장 오류";
  const title =
    allItems.find(
      (item) => path === item.href || path.startsWith(item.href + "/"),
    )?.title ?? "페이지";
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        본문 바로가기
      </a>
      <aside className="sidebar">
        <Brand />
        <Navigation />
        <div className="sidebar-footer">
          <span className="status-dot" /> V2 운영 관리
          <small>{connectionLabel}</small>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <span>SOMSSI 2R</span>
            <span aria-hidden="true">/</span>
            <strong>{title}</strong>
          </div>
          <div className="topbar-right">
            <Badge tone="amber">{demo ? "데모" : connectionLabel}</Badge>
            <span className="program-name">모두의창업 · 2라운드</span>
            <Link href="/settings" className="text-link">
              저장 위치
            </Link>
            <span className="avatar" aria-label="프로젝트">
              S
            </span>
          </div>
        </header>
        <details className="mobile-menu">
          <summary>메뉴 열기 · {title}</summary>
          <Navigation />
        </details>
        <main id="main-content" className="content" tabIndex={-1}>
          <div className="demo-strip">
            <span>
              <strong>{demo ? "샘플 데이터" : connectionLabel}</strong> ·{" "}
              {demo
                ? "화면 시연용이며 저장되지 않습니다."
                : connected
                  ? "이 컴퓨터에 운영 기록과 감사 이력을 저장합니다. 자동 클라우드 동기화는 없습니다."
                  : "로컬 저장소 상태를 확인해 주세요. 계정·클라우드 설정은 필요하지 않습니다."}
            </span>
            <Link href="/settings">
              구현 범위 확인 <span aria-hidden="true">→</span>
            </Link>
          </div>
          {children}
          <footer className="content-footer">
            <span>SOMSSI 2R CONTROL CENTER</span>
            <span>{demo ? "데모 · 저장되지 않음" : connectionLabel}</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
