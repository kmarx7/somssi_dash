import Link from "next/link";
import { getNavItem } from "@/lib/navigation";
import { Badge, ExternalLink, Notice, PageHeader, Panel } from "./ui";
import { Icon } from "./icon";
const plans: Record<string, string[]> = {
  "/schedule": [
    "활동 시작·종료와 마일스톤 기한을 하나의 달력으로 표시",
    "업무·활동과 공통 ID 연결",
    "기존 일정 데이터 확인 후 단계적 이전",
  ],
  "/activities": [
    "파일럿·교육·방문·회의 유형 및 장소 관리",
    "planned → prepared → conducted → evidenced → closed",
    "연결된 업무·지출·사진을 중복 입력 없이 조회",
  ],
  "/budget/allocate": [
    "기존 앱에서 편성 시뮬레이션 이용",
    "편성 결과의 DB 연동은 원본 회귀 검증 후 검토",
    "계산·디자인·슬라이더·다운로드의 회귀 검증 후 통합",
  ],
  "/budget/expenses": [
    "신청·승인·실집행·정산 금액을 별도로 관리",
    "부분집행·분할영수증·정정 거래와 변경 이력",
    "증빙 미비 거래를 삭제하지 않고 보완 상태로 유지",
  ],
  "/meetings": [
    "활동·참석자·관계 검증·서명 연결",
    "결정사항에서 담당자별 후속 업무 생성",
    "회의비 실제 지출과 공식 회의록 출력 연결",
  ],
  "/evidence": [
    "영수증·활동사진·서명 비공개 보관",
    "missing → uploaded → under_review → accepted / needs_revision",
    "SHA-256 중복 의심 안내와 기간 제한 다운로드",
  ],
  "/team": [
    "로그인 사용자 권한과 참여 인물 구분",
    "owner / admin / editor / viewer별 접근 통제",
    "참여 기간·담당 역할·원본 참여확인서 연결",
  ],
  "/partners": [
    "호텔·공간·멘토기관·협력사 관리",
    "제휴 단계·담당자·후속 일정 연결",
    "연락처 접근 권한과 변경 이력 관리",
  ],
  "/communications": [
    "제휴처별 이메일 템플릿과 연락 이력",
    "발송 예정·완료 기록 및 후속 일정 연결",
    "자동 이메일 발송은 1차 MVP 범위에서 제외",
  ],
  "/validation": [
    "사업가설·성공 기준·증빙 방법 관리",
    "무료·유료 파일럿 활동과 참가자 집계 연결",
    "전환·만족도 등 검증 지표와 결과 확인",
  ],
};
export function FeaturePage({ path }: { path: string }) {
  const item = getNavItem(path);
  const budget = path === "/budget/allocate";
  return (
    <>
      <PageHeader
        eyebrow={budget ? "ORIGINAL BUDGET PLANNER" : "FEATURE PREVIEW"}
        title={item.title}
        description={item.description}
        action={
          <Badge tone={item.external ? "blue" : "amber"}>
            {item.external ? "원본 연결" : "미구현"} · {item.phase} 예정
          </Badge>
        }
      />
      {budget ? (
        <Notice>
          <strong>기존 배분표 보존</strong>
          <br />이 웹앱은 배분표를 재구현하거나 계산값을 가져오지 않습니다. 원본
          사이트의 화면·계산·상호작용을 그대로 이용합니다. 배분값은 실제 지출이
          아닙니다.
        </Notice>
      ) : (
        <Notice>
          이 화면은 기능 안내입니다. 등록·수정·업로드·승인·저장 기능은 아직
          구현되지 않았습니다.
        </Notice>
      )}
      {item.external ? (
        <section className="external-card">
          <span className="icon-box">
            <Icon name={item.icon} size={28} />
          </span>
          <div>
            <Badge tone="blue">기존 외부 앱</Badge>
            <h2>
              {budget
                ? "200만 원 인터랙티브 예산 배분표"
                : `기존 ${item.title} 앱`}
            </h2>
            <p>
              {budget
                ? "별도 창에서 기존 시뮬레이션을 엽니다. 통합 DB 저장·자동 동기화는 미구현입니다."
                : "기존 도구를 새 창에서 이용할 수 있습니다. 이 웹앱과 데이터는 아직 연동되지 않습니다."}
            </p>
            <span className="external-domain">
              {new URL(item.external).hostname}
            </span>
          </div>
          <ExternalLink href={item.external}>원본 앱 열기</ExternalLink>
        </section>
      ) : (
        <section className="feature-empty">
          <span className="icon-box">
            <Icon name={item.icon} size={30} />
          </span>
          <h2>{item.title} 기능을 준비하고 있습니다.</h2>
          <p>{item.phase} 단계에서 데이터와 권한을 연결합니다.</p>
          <button className="button" disabled>
            {path === "/evidence"
              ? "파일 업로드"
              : path === "/budget/expenses"
                ? "지출 신청·승인"
                : "데이터 등록"}{" "}
            · 미구현
          </button>
        </section>
      )}
      <Panel title="예정된 기능" meta={<Badge>개발 계획 · {item.phase}</Badge>}>
        <ul className="planned-list">
          {(plans[path] ?? []).map((s, i) => (
            <li key={s}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              {s}
            </li>
          ))}
        </ul>
      </Panel>
      <Link className="text-link" href="/dashboard">
        대시보드로 돌아가기 →
      </Link>
    </>
  );
}
