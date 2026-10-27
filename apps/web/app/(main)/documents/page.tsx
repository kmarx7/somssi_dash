import { Badge, Notice, PageHeader, Panel } from "@/components/ui";
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
        description="원본 양식에 필요한 데이터만 입력해 같은 확장자로 출력할 예정입니다."
        action={<Badge tone="amber">생성·다운로드 미구현 · M5</Badge>}
      />
      <Notice>
        공식 원본 5종의 파일·해시·구조 조사를 마쳤습니다. 서버 등록·데이터
        주입·사진·서명 삽입·렌더 비교·다운로드는 아직 구현되지 않았습니다.
      </Notice>
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
              <span>서버 등록 전</span>
            </div>
            <button
              className="button"
              disabled
              aria-label={`${title} 생성 · 미구현`}
            >
              문서 생성 · 미구현
            </button>
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
              원본 버전·데이터 스냅샷·원본과 결과 해시·생성자·생성시간을 보관할
              예정입니다.
            </p>
          </div>
        </div>
      </Panel>
    </>
  );
}
