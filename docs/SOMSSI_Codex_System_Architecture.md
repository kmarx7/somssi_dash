# SOMSSI 2R CONTROL CENTER — Codex 구현 아키텍처 명세 v1.0

기준일: 2026-10-27
대상: 모두의창업 2R SOMSSI 팀 운영 통합 시스템

## 0. 최상위 불변 요구사항

1. 기존 200만 원 인터랙티브 예산 배분표의 화면·계산·상호작용은 변경하지 않는다. 기존 소스 확보 전에는 연결 링크만 제공하고 기능을 재구현했다고 주장하지 않는다.
2. 공식 Word 양식 4종은 업로드된 원본 `.docx`를 복제하여 입력 데이터만 주입하고 `.docx`로 내려받게 한다.
3. 정산 엑셀은 업로드된 원본 `.xlsx`를 복제하여 입력 데이터만 주입하고 `.xlsx`로 내려받게 한다.
4. 출력의 표/병합 셀/텍스트 스타일/페이지 설정/사진 및 서명 위치/시트명/수식/인쇄 영역을 보존한다. 데이터가 길어질 경우 레이아웃 검사 후 수정 요청 표시.
5. 중복 입력 금지: 일정·활동·업무·지출·회의·첨부파일·문서는 공통 ID로 관계를 맺는다.
6. 예산 배정액, 예정액, 신청액, 승인액, 실제 지출액, 정산 완료액을 혼동하지 않는다.
7. 일단 지출된 거래는 증빙 미비를 이유로 삭제하지 않고 `보완 필요`로 관리하며 모든 수정 이력을 남긴다.
8. 개인정보/영수증/서명은 비공개 저장소, 서버 측 인증·인가, 기간 제한 URL로 보호한다.
9. 실제 지침 확인이 필요한 규정은 운영자가 버전별로 설정하며 UI 임의 숫자를 법적 기준으로 고정하지 않는다.
10. 오프라인 단일 HTML은 UX 참고안이며, 실사용 버전은 영속 DB와 권한 체계가 있는 웹앱이다.

## 1. 범위

### 기존 기능
- 2R 실행 일정: https://moonlit-rugelach-64f4b6.netlify.app/
- 200만 원 배분표: https://coruscating-duckanoo-f67d1c.netlify.app/
- SOMSSI 팀 회의록: https://lighthearted-custard-cba5db.netlify.app/
- 이메일 템플릿: https://fluffy-florentine-6c87d5.netlify.app/
- 프론트엔드 참고: `SOMSSI_2R_Control_Center.html`

### 신규 기능
공통 로그인/권한, 프로젝트 설정, 마일스톤, 일정, 업무, 활동, 실제 지출/정산, 증빙 첨부, 문서 생성, 팀원, 제휴처, 파일럿 KPI, 제출 이력, 변경 이력.

### 제외(1차 MVP)
자동 은행계좌 동기화, 자동 카드 결제, OCR 정확성에 의존한 승인, 자동 발송 이메일, AI가 임의 승인하는 회계, 대규모 멀티테넌트 SaaS.

## 2. 기술 구조

- 웹 UI: Next.js App Router, React, TypeScript, Tailwind CSS.
- 애플리케이션 경계: Next.js 서버 액션/Route Handlers + Zod 검증. 브라우저에서 비밀키나 문서 생성 서비스 직접 접근 금지.
- DB/Auth/File: Supabase(PostgreSQL, Auth, private Storage, RLS).
- 문서 워커: Python + FastAPI; `python-docx`와 `openpyxl` 및 원본 OOXML 검증 도구. 원본 파일의 행/병합 구조는 최대한 불변. 복잡한 텍스트 런 교체는 XML 레벨 또는 미리 정의된 필드 영역만 사용.
- 로컬 개발: Mac의 Node.js LTS, Python 3.11/3.12 가상환경. npm, pip 환경 분리.
- 배포: Next.js는 Vercel, Python 서비스는 Python 컨테이너를 실행할 수 있는 호스팅, DB/비공개 파일은 Supabase. 문서 서비스는 내부 API 키/서버 대 서버 통신으로 제한.
- 실시간 협업은 필요한 화면에서만 적용. 회의록/정산의 동시 편집 충돌에는 version 또는 updated_at 낙관적 잠금 적용.

## 3. 화면 IA / 라우트

```
/login                     로그인
/overview                  사업 개요
/dashboard                 오늘 할 일 / 예산 / 위험 알림
/schedule                  캘린더 및 마일스톤
/activities                파일럿·회의·방문 등 사업 활동
/tasks                     업무 / 담당자 / 상태
/budget/allocate           기존 예산 배분표 연결(보존)
/budget/expenses           자금 지출 목록 / 신청 / 승인 / 정산
/budget/expenses/[id]      지출 상세 / 증빙 / 이력
/meetings                  회의 목록
/meetings/[id]             회의록 / 참석자 / 결정 / 후속 업무
/evidence                  첨부파일 관리 / 증빙 누락
/documents                 공식 제출서류 생성·다운로드
/team                      팀원 정보 / 참여확인서
/partners                  호텔·공간·멘토기관·협력사
/communications            이메일 템플릿 / 발송 이력
/validation                사업가설 / 파일럿 KPI / 설문
/settings                  팀 설정·비목·양식·권한
```

## 4. 데이터 모델: 최소 핵심 테이블

각 테이블은 `id UUID`, `project_id UUID`, `created_at`, `updated_at`, `created_by`를 기본으로 한다. 사람 관련 개인정보는 필요 최소한의 필드만 수집한다.

1. `projects`: 이름, 프로그램, 라운드, 전체예산(정수 원), 시작/종료일.
2. `project_members`: `user_id`, 프로젝트 역할(owner/admin/editor/viewer), 활성 여부.
3. `people`: 이름, 역할, 소속, 참여 기간, 관계(집행 적격성 확인용), 민감정보 분리.
4. `milestones`: 제목, 기한, 상태, 목표 산출물.
5. `activities`: 제목, 활동유형, 목적, 장소, 시작/종료, 담당자, 상태, 관련 마일스톤.
6. `tasks`: 제목, 설명, 마감일, 담당자, 상태, 우선순위, `activity_id`, `meeting_id`.
7. `budget_categories`: 비목, 승인 한도, 규정 버전, 정렬 순서.
8. `budget_allocations`: 비목, 편성 금액, 편성 버전, 작성자, 확정 상태. 기존 위젯과 연동 시 원본 로직 존중.
9. `expense_requests`: 신청일, 금액, 비목, 활동, 요청자, 상태, 승인자, 승인일, 사유.
10. `expenses`: 집행일, 실제금액, 거래처, 사용목적, 비목, 활동, 신청 참조, 지급수단(민감정보 제외), 정산상태, 증빙검사상태.
11. `meetings`: 활동 참조, 제목, 일시, 장소, 목적, 본문, 결정사항, 상태, 회의비 지출 참조.
12. `meeting_attendees`: 회의, 참석자, 참석 유형, 서명 파일 참조, 관계검증 상태.
13. `evidence_files`: 파일경로(private), 파일종류, 원본명, SHA-256, 업로드자, 연결대상 종류+ID, 업로드일.
14. `purchase_justifications`: 지출 참조, 물품명, 총액, 사업 관련성, 임차불가 사유, 사진 파일 연결.
15. `document_templates`: 문서 종류, 원본 파일 버전, 원본 해시, 필드매핑 버전, 등록일.
16. `document_jobs`: 양식, 데이터 스냅샷, 생성 상태, 생성파일 비공개 경로, 검증결과, 생성자, 생성 시각.
17. `submission_batches`: 제출 묶음명, 제출일, 포함 문서, 완료 상태, 수정 버전.
18. `partners`: 협력처 이름, 유형, 담당자, 연락수단, 진행상태.
19. `communications`: 협력처, 템플릿 유형, 발송 예정/완료일, 발송 상태, 결과/후속 일정.
20. `hypotheses`: 가설, 목표 지표, 성공 기준, 증빙 방법, 검증 상태.
21. `experiments`: 가설, 활동, 무료/유료 유형, 참가자수, 전환/만족도 등 집계값, 증빙.
22. `audit_logs`: 작성/수정/승인/반려/정산/문서생성의 행위자, 시각, 대상, 이전값·변경값(민감정보 최소화).

**관계 원칙**
- `projects 1:N activities/tasks/expenses/meetings`
- `activities 1:N tasks/expenses/meetings/evidence_files`
- `meetings 1:N meeting_attendees/tasks`
- `expenses 1:N evidence_files`, 구매 사유서는 `expenses 1:0..1` 등.
- `document_jobs`는 생성시점 데이터 스냅샷/템플릿 버전을 보유하여 같은 제출 문서를 재현 가능하게 함.
- 원화는 소수점 부동소수(float) 대신 DB `bigint` 원 단위로 저장.

## 5. 업무 상태 머신

- 업무: `todo → in_progress → blocked | done`; 완료 후 재개 시 이력 기록.
- 활동: `planned → prepared → conducted → evidenced → closed`.
- 지출 신청: `draft → submitted → approved | rejected`; 실제 지출은 별도 트랜잭션으로 기록.
- 증빙: `missing → uploaded → under_review → accepted | needs_revision`.
- 정산: `unreviewed → pending_documents → ready_for_review → approved | returned`.
- 문서 작업: `queued → processing → generated → validated | failed`.

활동비 규칙: 원본 활동비 60만 원 한도(제공 상세내역 기준)를 설정 가능한 규정 값으로 관리. 회의비 식사/다과별 1인당 상한 및 가족 지출제한, 사진 최소 1장(활동/회의), 구매물품 사진 최소 2장(구매 사유서)을 각 양식 유형 규칙으로 검사. 적용 여부는 집행 당시 멘토기관 규정 버전으로 판정.

## 6. 예산/실집행 계산

- `total_budget = 2,000,000` 원 (초기 프로젝트 설정값)
- `allocated = sum(확정된 budget_allocations)`
- `actual_spent = sum(취소되지 않은 실제 expenses.amount)`
- `remaining_cash_budget = total_budget - actual_spent`
- `pending_commitments = sum(승인되었으나 아직 실제지출에 대응되지 않은 신청 잔액)`
- `available_to_commit = total_budget - actual_spent - pending_commitments`
- `settled = sum(정산 완료 상태인 실제 지출)`
- 부분집행/분할영수증/수정거래(역분개 등) 고려. 예산 초과 경고, 승인 통제와 실제 거래 기록의 보존은 구분.

## 7. 공식 문서 보존 및 생성

### 템플릿 목록
- `activity_evidence.docx` = 붙임2 활동비 증빙
- `meeting_minutes.docx` = 붙임3 회의록(회의비 증빙)
- `purchase_justification.docx` = 붙임4 물품 구매 사유서
- `team_participation.docx` = 붙임5 팀원 참여 확인서
- `fund_usage_details.xlsx` = 업로드된 창업활동자금 세부내역

### 생성 절차
1. 권한 확인 → 공식 템플릿 버전 고정 → 대상 데이터 스냅샷 저장.
2. 양식별 필수 필드 검사; 미비한 필드 표기 후 사용자 보완 요청.
3. 원본 바이너리 복제 → 지정된 표 셀·필드만 치환 → 서명·사진 원본 위치에 삽입.
4. Word는 원본 서식/기존 병합 셀/글꼴/페이지 설정 등을 유지. Excel은 시트/병합/수식/숫자 형식/인쇄 영역/기존 유효성 규칙 유지.
5. DOCX/XLSX 각각 패키지 구조 검사. Word 렌더 PNG를 원본 PNG와 시각 비교, Excel의 시트 구조 및 중요 수식/서식 비교.
6. 비교 실패 또는 페이지 넘침 시 `검토 필요`로 표시하고 제출 완료로 처리하지 않음.
7. 최종 원본과 동일 확장자 다운로드. 최종 문서 저장 시 원본 해시, 결과 해시, 템플릿 버전, 생성자, 생성시간 기록.

참고: 완전히 동일한 픽셀 배치는 Word 앱/설치 폰트/프린터 드라이버/길이가 다른 데이터에 따라 차이가 있을 수 있으므로 `원본 서식 보존 + 출력 렌더 비교`를 품질 기준으로 삼는다. 원본 테이블 구조 변경을 요구하는 새 항목은 자동 확장하지 말고 사용자 확인 대상으로 둔다.

## 8. 권한 및 보안

- owner: 팀/권한/템플릿/전체 내역 관리.
- admin: 운영 데이터·지출 승인·문서 출력(최종 승인권한은 지침에 따름).
- editor: 자기 업무/회의/지출 신청/증빙 등록.
- viewer: 조회 전용; 영수증/개인정보 등은 별도 열람 권한.
- 모든 DB 주요 테이블에서 `project_id` + 사용자 멤버십에 따른 RLS.
- 비공개 Storage 버킷: `evidence-private`, `templates-private`, `generated-private`.
- 브라우저/네트워크 로그에 주민정보·연락처·서명 URL·서비스 키 노출 금지.
- 지출 승인자는 신청자와 구분하는 정책 옵션을 제공.

## 9. 권장 소스 폴더

```
somssi-control-center/
├── AGENTS.md
├── README.md
├── docs/
│   ├── REQUIREMENTS.md
│   ├── DATA_MODEL.md
│   ├── DOCUMENT_MAPPING.md
│   ├── DESIGN_SYSTEM.md
│   └── TEST_PLAN.md
├── apps/
│   └── web/
│       ├── app/(auth)/login/page.tsx
│       ├── app/(main)/dashboard/page.tsx
│       ├── app/(main)/overview/page.tsx
│       ├── app/(main)/schedule/page.tsx
│       ├── app/(main)/tasks/page.tsx
│       ├── app/(main)/budget/allocate/page.tsx
│       ├── app/(main)/budget/expenses/page.tsx
│       ├── app/(main)/meetings/page.tsx
│       ├── app/(main)/documents/page.tsx
│       ├── app/(main)/team/page.tsx
│       ├── app/(main)/partners/page.tsx
│       ├── app/(main)/validation/page.tsx
│       ├── app/(main)/settings/page.tsx
│       ├── app/api/
│       ├── components/
│       ├── features/
│       └── lib/
├── services/
│   └── docgen/
│       ├── app/main.py
│       ├── app/generators/
│       ├── app/mappings/
│       ├── tests/
│       └── requirements.txt
├── supabase/
│   ├── migrations/
│   └── seed.sql
├── original-templates/       # 원본 유지, Git에는 공개하지 않음
├── tests/
├── .env.example
└── .gitignore
```

## 10. 구현 마일스톤과 완료 조건

### M0 원본 조사
- 기존 HTML 4종 소스 확보 여부 확인; 기존 로직 스크린샷/테스트 케이스 작성.
- DOCX 4개와 XLSX 1개의 서식별 필드매핑 시트 작성.
- 데모 데이터는 별도 폴더/별도 DB 스키마. 실제 지출로 섞지 않음.

### M1 웹앱 골격
- Next.js/TypeScript/Tailwind 기반 네비게이션, 모바일 반응형 레이아웃, 공통 컴포넌트.
- 개요/대시보드/메뉴 전환 완성. 샘플 값에는 `데모` 표시.

### M2 데이터 및 로그인
- Supabase 연동, migration, 기본 권한/RLS, 초대 사용자 로그인.
- 담당자/업무/일정 CRUD와 감사 이력.

### M3 기존 앱 통합
- 일정·회의록·이메일은 임시 연결 후 소스가 있으면 단계적 마이그레이션.
- 예산 배분 시뮬레이션은 기준 화면과 테스트 사례 대비 회귀 테스트 통과가 필수.

### M4 지출·정산
- 신청/승인/집행/증빙/보완 상태, 원 단위 정확 계산.
- 활동비/회의비/물품구매 필수 문서 누락 경고.

### M5 출력 엔진
- 4 DOCX 및 1 XLSX 출력, 사진/서명, 미리보기·다운로드, 원본 양식 자동 비교 테스트.
- 누락 필수 필드는 명시적으로 경고. 양식 무단 재디자인 금지.

### M6 파일럿·운영·보안
- 가설/KPI/파일럿 결과 집계, 권한 테스트, 백업/복원, 배포.
- 실제 데이터를 이용한 end-to-end 시나리오 검증.

## 11. 핵심 E2E 테스트

1. 파일럿 일정 생성 → 후속 업무 3개 생성 → 활동 연결 → 진행률 반영.
2. 회의 등록 → 참석자/결정사항 입력 → 담당자 업무 생성 → 회의비 지출 연결 → 사진·서명 포함 원본 DOCX 생성.
3. 지출 신청 5만 원 → 승인 → 실제 4만 원 집행 → 미집행 약정 1만 원 올바르게 남음.
4. 영수증 없는 지출은 삭제되지 않고 정산 `보완 필요` 표시.
5. 동일 파일 재업로드 시 해시 기반 중복 의심 안내.
6. 활동비 한도 초과 또는 인당 회의비 기준 초과 시 규정 버전과 계산 근거 표시.
7. DOCX 원본 4종 구조 비교, 사진 요구 개수 검사, Excel 원본의 모든 시트/병합/수식/인쇄영역 비교.
8. 뷰어가 승인 API/다른 프로젝트 영수증에 접근하면 거부.
9. 인터넷을 새로고침/다른 기기에서 열어도 DB 데이터 유지.
10. 기존 예산 배분표의 계산 및 디자인이 통합 전과 같음.

## 12. Codex에 제시할 최초 지시문

```
당신은 SOMSSI 모두의창업 2R 통합 운영 시스템의 시니어 풀스택 개발자입니다.
먼저 docs/SOMSSI_Codex_System_Architecture.md 및 원본 양식 5개와 기존 HTML을 검토하세요.
코드 작성 전 다음을 산출하세요:
1) 실제 확인한 파일 목록과 확인되지 않은 기존 소스
2) 확정 요구사항과 불명확한 항목
3) Next.js/Supabase/FastAPI 구성도
4) DB ERD 및 RLS 접근정책
5) 원본 DOCX/XLSX 템플릿 필드매핑 설계
6) 마일스톤별 구현/테스트 계획
7) 1단계 MVP에서 미구현 항목
이후 M1 웹앱 골격부터 구현하되 한 단계씩 빌드/테스트/완료 내역을 보고하세요.
원본 예산 배분표의 계산·디자인은 변경하지 마세요.
원본 DOCX 4개와 XLSX 1개의 서식을 새 디자인으로 다시 만들지 마세요.
시연용 데이터와 실제 데이터는 혼합하지 마세요.
문서 생성/승인 기능을 실제 구현하지 않았다면 UI에서 구현 완료처럼 표현하지 마세요.
```

## 13. 파일 제공 체크리스트

- `SOMSSI_2R_Control_Center.html`
- 공식 DOCX 4종 원본
- 자금 세부내역 XLSX 원본
- 기존 Netlify 앱의 HTML/CSS/JS 원본 파일 또는 프로젝트 전체 폴더
- 멘토기관의 최신 집행 기준 문서(확보 시)
- 실제 2R 일정과 업무 마스터 목록(확보 시)

끝.
