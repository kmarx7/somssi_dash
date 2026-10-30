import { DocumentCenter } from "@/components/documents/document-center";
import { Badge, Notice, PageHeader, Panel } from "@/components/ui";
import { sourceRegistry } from "@/data/reference/v2";
import { Icon } from "@/components/icon";
export const metadata = { title: "공식 문서 출력" };
const templates = [
  [
    "붙임2 · 활동비 증빙",
    "DOCX",
    "활동 목적 · 집행내역 · 현장 사진",
    "activity_evidence.docx",
  ],
  [
    "붙임3 · 회의록",
    "DOCX",
    "회의 내용 · 참석자 · 사진 · 서명",
    "meeting_minutes.docx",
  ],
  [
    "붙임4 · 물품 구매 사유서",
    "DOCX",
    "사업 연관성 · 임차 불가 사유 · 물품 사진",
    "purchase_justification.docx",
  ],
  [
    "붙임5 · 팀원 참여 확인서",
    "DOCX",
    "참여 인물 · 관계 · 활동 기간 · 서명",
    "team_participation.docx",
  ],
  [
    "창업활동자금 집행 상세내역",
    "XLSX",
    "지출 내역 · 증빙 참조 · 원본 합계 수식",
    "fund_usage_details.xlsx",
  ],
];
export default function Documents() {
  return (
    <>
      <PageHeader
        eyebrow="OFFICIAL DOCUMENTS"
        title="공식 문서 출력"
        description="원본 회의록·활동비·물품 사유서·세부내역을 복제해 작성합니다."
        action={<Badge tone="amber">원본 4종 작성 · 검토 필요</Badge>}
      />
      <Notice>
        사용자 제공 원본 4종에 로컬 데이터와 지출 원장을 입력해 DOCX/XLSX로
        작성합니다. 결과는 검토용이며 회의 현장사진·물품사진 삽입과 서명은 수동
        보완이 필요합니다. 팀원 참여 확인서 자동 작성은 아직 지원하지 않습니다.
      </Notice>
      <Panel
        title="2R 사업계획서·활동보고서 원본 미확보"
        meta={<Badge tone="amber">생성 불가</Badge>}
      >
        <p className="muted">
          최종종합본 DOCX는 로컬에 확보했습니다. 공식 사업계획서·활동보고서
          HWP/HWPX는 추가 확보가 필요합니다. 활동비 증빙 DOCX는 2R 활동보고서
          양식을 대신하지 않습니다. DOCX 변환·10/5쪽 제한·맑은고딕 12pt/표
          10pt는 원본 확보 후 렌더링으로 검증합니다.
        </p>
        <ul className="planned-list">
          {sourceRegistry
            .filter((s) =>
              ["final-plan", "official-plan", "official-report"].includes(s.id),
            )
            .map((s) => (
              <li key={s.id}>
                {s.title} · {s.available ? "로컬 확보 · 내용 대조" : "미확보"}
              </li>
            ))}
        </ul>
      </Panel>
      <DocumentCenter />
      <div className="documents-grid">
        {templates.map(([title, ext, desc, file]) => (
          <article className="document-card" key={file}>
            <div className="document-top">
              <span className="icon-box">
                <Icon name="document" size={24} />
              </span>
              <Badge tone={ext === "DOCX" ? "blue" : "green"}>{ext}</Badge>
            </div>
            <h2>{title}</h2>
            <p>{desc}</p>
            <span className="document-file">{file}</span>
            <div className="document-state">
              <Badge>원본 로컬 확인</Badge>
              <span>로컬 준비 상태는 위에서 확인</span>
            </div>
            {file === "team_participation.docx" ? (
              <button
                className="button"
                disabled
                aria-label={`${title} 생성 · 미구현`}
              >
                문서 생성 · 미구현
              </button>
            ) : (
              <a className="button" href="#document-inputs">
                입력 초안·자동 작성
              </a>
            )}
          </article>
        ))}
      </div>
      <Panel title="원본 보존과 검증 기준">
        <div className="preservation-grid">
          <div>
            <h3>원본을 복제해 입력</h3>
            <p>
              표·병합 셀·글꼴·페이지·서명·사진 위치와 Excel 시트·수식·인쇄
              영역을 보존합니다.
            </p>
          </div>
          <div>
            <h3>검증을 통과한 문서만 제출</h3>
            <p>
              구조·렌더 비교와 넘침 검사를 거치며, 필드 누락이나 검증 실패는
              검토 대상으로 표시합니다.
            </p>
          </div>
          <div>
            <h3>생성 시점을 재현</h3>
            <p>
              원본 버전·데이터 스냅샷·원본과 결과 해시·생성자·생성시간을 로컬에
              보관합니다.
            </p>
          </div>
        </div>
      </Panel>
    </>
  );
}
