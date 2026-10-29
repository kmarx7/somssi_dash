import Link from "next/link";
import { Badge, PageHeader, Panel } from "@/components/ui";
import { Icon } from "@/components/icon";
import { v2Reference } from "@/data/reference/v2";
export const metadata = { title: "사업 개요" };
const flow = [
  ["01", "일정·활동", "무엇을, 언제 실행할지 계획"],
  ["02", "업무·회의", "담당자와 결정사항 연결"],
  ["03", "집행·증빙", "실제 거래와 근거 보관"],
  ["04", "정산·제출", "원본 양식으로 문서 생성"],
];
export default function Overview() {
  return (
    <>
      <PageHeader
        eyebrow="PROJECT OVERVIEW"
        title="실행부터 제출까지, 한곳에서."
        description="SOMSSI 2라운드의 일정·업무·예산·증빙을 연결하는 운영 공간입니다."
        action={
          <Link className="button button-primary" href="/dashboard">
            대시보드 보기 <Icon name="arrow" size={16} />
          </Link>
        }
      />
      <section className="project-banner">
        <div>
          <Badge tone="blue">모두의창업 · 2라운드</Badge>
          <h2>
            SOMSSI <span>2R Control Center</span>
          </h2>
          <p>{v2Reference.vision}</p>
          <div className="banner-tags">
            <span>프로젝트 운영</span>
            <span>예산·정산</span>
            <span>사업가설 검증</span>
          </div>
        </div>
        <div className="banner-budget">
          <span>1R 활동자금 · 기본 배정 계획</span>
          <strong>2,000,000원</strong>
          <small>편성 시뮬레이션과 실제 집행은 구분합니다.</small>
        </div>
      </section>
      <div className="section-heading">
        <h2>하나의 기록으로 이어지는 운영</h2>
        <Badge>개발 목표</Badge>
      </div>
      <div className="flow-grid">
        {flow.map(([n, title, desc]) => (
          <article className="flow-step" key={n}>
            <span className="step-number">{n}</span>
            <h3>{title}</h3>
            <p>{desc}</p>
          </article>
        ))}
      </div>
      <div className="two-columns overview-bottom">
        <Panel
          title="자주 찾는 작업"
          meta={<span className="muted text-small">원본 연결 / 준비 중</span>}
        >
          <div className="quick-links">
            {[
              ["/schedule", "calendar", "2R 실행 일정", "기존 일정 앱 연결"],
              [
                "/budget/allocate",
                "budget",
                "200만 원 예산 배분표",
                "원본 화면·계산 그대로 이용",
              ],
              [
                "/documents",
                "document",
                "공식 제출서류",
                "원본 양식 확인 · 생성은 M5 예정",
              ],
            ].map(([href, icon, title, desc]) => (
              <Link className="quick-link" href={href} key={href}>
                <span className="icon-box">
                  <Icon name={icon} size={21} />
                </span>
                <span>
                  <strong>{title}</strong>
                  <small>{desc}</small>
                </span>
                <Icon name="arrow" size={16} />
              </Link>
            ))}
          </div>
        </Panel>
        <Panel
          title="현재 개발 단계"
          meta={<Badge tone="blue">V2 운영 관리</Badge>}
        >
          <ol className="phase-list">
            <li className="phase-active">
              <span>01</span>
              <div>
                <strong>웹앱 프론트엔드 골격</strong>
                <p>기존 메뉴·업무 필터 보존 · 기준자료·상품 가설 추가</p>
              </div>
              <Badge tone="green">보존</Badge>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>로컬 데이터 저장</strong>
                <p>계정 없이 이 컴퓨터에 업무·실증·정산 기록 저장</p>
              </div>
              <Badge>바로 사용</Badge>
            </li>
            <li>
              <span>03–06</span>
              <div>
                <strong>앱 통합부터 정산·출력까지</strong>
                <p>로컬 백업·복구 구현, 공식 문서 출력은 준비 중</p>
              </div>
              <Badge>부분 구현</Badge>
            </li>
          </ol>
          <Link className="text-link" href="/settings">
            전체 구현 범위 확인 <span aria-hidden="true">→</span>
          </Link>
        </Panel>
      </div>
    </>
  );
}
