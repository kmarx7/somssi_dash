import { SettingsControls } from "@/components/operations/settings-controls";
import Link from "next/link";
import { Badge, Notice, PageHeader, Panel } from "@/components/ui";
export const metadata = { title: "프로젝트 설정" };
const phases = [
  ["M1", "웹앱 골격", "개요·대시보드·전체 메뉴·반응형·데모 업무 필터", "구현"],
  [
    "M2",
    "데이터·로그인",
    "인증·RLS·업무/일정·감사·버전 충돌",
    "구현 · 원격 연결 대기",
  ],
  [
    "M3",
    "기존 앱 통합",
    "기존 소스 확인·일정/회의록/이메일·예산 회귀 검증",
    "미구현",
  ],
  [
    "M4",
    "지출·정산",
    "실집행·정정·증빙·관리자 검토. 신청/승인·규정 판정 미구현",
    "부분 구현",
  ],
  ["M5", "원본 문서 출력", "4 DOCX/1 XLSX·사진/서명·렌더 검증", "미구현"],
  [
    "M6",
    "성과·운영·보안",
    "실증·설문·멘토링·AI·백업. 복원·배포 미검증",
    "부분 구현",
  ],
];
export default function Settings() {
  return (
    <>
      <PageHeader
        eyebrow="PROJECT SETTINGS"
        title="프로젝트 설정"
        description="현재 구현 범위와 다음 단계의 연결 항목을 확인합니다."
        action={<Badge tone="amber">운영 연결·백업</Badge>}
      />
      <SettingsControls />
      <Notice>
        운영 기록은 로그인 후에만 조회됩니다. 개인정보·영수증·서명은 로그인과
        저장소 권한 확인 후 필요한 최소 정보만 보관하세요.
      </Notice>
      <Panel
        title="V2 운영 관리 · 현재 범위"
        meta={<Badge tone="blue">저장·실증·정산 기반</Badge>}
      >
        <p className="muted">
          현행 분석·비전·Q1–Q4·상품 가설·원본 확보 상태를 정리했습니다. 기본
          대시보드는 연결한 운영 기록을 집계하며, 기존 데모는 별도 경로로
          보존합니다. 운영 등록·저장은 Supabase 연결 후 사용할 수 있습니다. 공식
          출력·템플릿 렌더 검증은 아직 구현되지 않았습니다.
        </p>
        <Link href="/business-plan" className="text-link">
          기준자료 확인 →
        </Link>
      </Panel>
      <Panel title="단계별 구현 현황" meta={<Badge tone="blue">V2</Badge>}>
        <div className="table-scroll">
          <table>
            <caption className="sr-only">마일스톤 구현 범위</caption>
            <thead>
              <tr>
                <th>단계</th>
                <th>기능</th>
                <th>범위</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {phases.map(([id, name, desc, status]) => (
                <tr key={id}>
                  <td>{id}</td>
                  <td>
                    <strong>{name}</strong>
                  </td>
                  <td className="wrap-cell">{desc}</td>
                  <td>
                    <Badge tone={status === "구현" ? "green" : "neutral"}>
                      {status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <div className="two-columns">
        <Panel title="로그인·권한">
          <p className="muted">
            인증·멤버십/RLS·낙관적 잠금·서버 감사 이력을 구현했습니다. 실제
            프로젝트 연결 후 계정별 접근을 최종 확인합니다.
          </p>
          <Link href="/login" className="button">
            로그인 화면 보기
          </Link>
        </Panel>
        <Panel title="규정·양식 설정">
          <p className="muted">
            활동비·회의비·사진 기준은 집행 당시 멘토기관 규정 버전으로 판정할
            예정입니다. 적용 기준과 승인권자는 아직 연결되지 않았습니다.
          </p>
          <button className="button" disabled>
            규정·권한 설정 · 미구현
          </button>
        </Panel>
      </div>
    </>
  );
}
