import { SettingsControls } from "@/components/operations/settings-controls";
import Link from "next/link";
import { Badge, Notice, PageHeader, Panel } from "@/components/ui";
export const metadata = { title: "프로젝트 설정" };
const phases = [
  ["M1", "웹앱 골격", "기존 레이아웃·메뉴·데모 필터 보존", "구현"],
  [
    "M2",
    "로컬 저장",
    "SQLite·입력 검증·감사 이력·버전 충돌·재실행 유지",
    "구현",
  ],
  [
    "M3",
    "기존 앱 통합",
    "원본 앱 연결 보존, 기존 데이터 자동 이관은 미구현",
    "부분 구현",
  ],
  [
    "M4",
    "지출·정산",
    "실집행·정정·증빙·정산 검토. 신청/승인·규정 자동 판정 미구현",
    "부분 구현",
  ],
  ["M5", "원본 문서 출력", "공식 DOCX/XLSX 생성·렌더 검증", "미구현"],
  [
    "M6",
    "성과·백업",
    "실증·설문·멘토링·AI·증빙 포함 전체 백업·새 폴더 복구",
    "부분 구현",
  ],
];
export default function Settings() {
  return (
    <>
      <PageHeader
        eyebrow="LOCAL PROJECT SETTINGS"
        title="프로젝트 설정"
        description="이 컴퓨터의 저장 위치와 백업·복구 범위를 확인합니다."
        action={<Badge tone="blue">로컬 저장</Badge>}
      />
      <SettingsControls />
      <Notice>
        계정 로그인 없이 이 컴퓨터에 저장합니다. 운영 폴더와 백업에는
        개인정보·증빙이 포함될 수 있습니다. 이 컴퓨터를 사용하는 사람과 파일
        접근 권한을 함께 관리하세요.
      </Notice>
      <Panel title="V2 운영 관리 · 현재 범위">
        <p className="muted">
          대시보드와 입력 화면은 같은 로컬 기록을 사용합니다. 기존 데모는 별도
          경로로 보존합니다. 공식 출력·템플릿 렌더 검증은 아직 구현되지
          않았습니다.
        </p>
        <Link href="/business-plan" className="text-link">
          기준자료 확인 →
        </Link>
      </Panel>
      <Panel title="단계별 구현 현황" meta={<Badge>로컬 모드</Badge>}>
        <div className="table-scroll">
          <table>
            <caption className="sr-only">단계별 구현 범위</caption>
            <thead>
              <tr>
                <th>단계</th>
                <th>기능</th>
                <th>범위</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {phases.map(([id, name, description, status]) => (
                <tr key={id}>
                  <td>{id}</td>
                  <td>{name}</td>
                  <td className="wrap-cell">{description}</td>
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
        <Panel title="이 컴퓨터에서 사용">
          <p className="muted">
            127.0.0.1 또는 localhost 주소에서만 데이터를 읽고 쓸 수 있습니다.
            다른 기기와 자동 동기화하거나 팀원별 로그인·접근 권한을 나누지
            않습니다. 앱을 종료해도 저장 파일은 유지됩니다.
          </p>
        </Panel>
        <Panel title="규정·양식 설정">
          <p className="muted">
            기관별 집행 규정 자동 판정과 공식 문서 생성은 준비 중입니다. 현재의
            저장·백업을 공식 제출서류 생성으로 표시하지 않습니다.
          </p>
          <Link href="/documents" className="text-link">
            공식 문서 준비 상태 →
          </Link>
        </Panel>
      </div>
    </>
  );
}
