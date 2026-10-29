"use client";
import Link from "next/link";
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
  const demo = path === "/tasks" || path === "/dashboard/demo";
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
          <span className="status-dot" /> V2 기준 정비
          <small>읽기 전용 · 서버 미연결</small>
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
            <Badge tone="amber">{demo ? "데모" : "데이터 미연결"}</Badge>
            <span className="program-name">모두의창업 · 2라운드</span>
            <span className="avatar" aria-label="데모 프로젝트">
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
              <strong>{demo ? "샘플 데이터" : "운영 데이터 미연결"}</strong> ·{" "}
              {demo
                ? "화면 시연용이며 저장되지 않습니다."
                : "실제 기록의 등록·수정·저장은 아직 지원하지 않습니다."}
            </span>
            <Link href="/settings">
              구현 범위 확인 <span aria-hidden="true">→</span>
            </Link>
          </div>
          {children}
          <footer className="content-footer">
            <span>SOMSSI 2R CONTROL CENTER</span>
            <span>V2 기준 정비 · 운영 데이터 미연결</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
