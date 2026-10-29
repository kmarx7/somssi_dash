# SOMSSI V2 운영 기능 구현 보고

작성일: 2026-10-30. 브랜치: feat/v2-operations-storage. 기존 기준 정비 커밋1684135 위에 구현했다. main 병합과 실서비스 배포는 수행하지 않는다.

## 구현한 작동 범위

- Supabase 서버 인증·HttpOnly쿠키·로그아웃·프로젝트 활성 멤버십·역할/RLS. 저장소 미설정·미로그인·권한없음·장애 상태를 구분하며 미연결 화면에서 저장을 비활성화한다.
- 21개 도메인 종류의 입력/조회, 불변 원장 외 수정, 출처/확인일/검증상태·증빙·동일 프로젝트 연결. 실제 등록 성공은 DB 검증/쓰기/감사 이력이 같은 트랜잭션에서 커밋된 뒤에만 표시한다.
- 실제 기록 기반 대시보드, 이번 주 업무/지연, 조사·결제 구분, 파트너 접촉/협의/계약, 실제 파일럿/멘토링/AI 활용, 영수증/증빙 누락. 빈 기록은 0 또는 미입력, 미연결 잔액은 확인 필요로 표시한다.
- 상품 가격/고정비/인당 변동비와 인원에 따른 계획 공헌이익. 실제 회차는 같은 결제/지출 원장에서 매출·비용·순이익·만족·성취를 계산한다.
- 예산 편성/실집행과 세 자금 분리. 원거래 불변·정정 증감 분개·정정 사유/원거래 참조, 과다 역분개 방지, 관리자 정산 검토. 지출 삭제 API/버튼/정책 없음. 정정 그룹 전체를 검토하기 전에는 정산 완료액에 합산하지 않는다.
- 비공개 증빙 업로드(최대10MB), SHA-256·원본명/종류/크기, 연결 증빙 선택, 역할 재확인 후60초다운로드. metadata 등록 실패는 비공개 orphan ID를 안내하며 완료 처리하지 않는다.
- 목록 CSV(수식 주입 완화), 관리자 JSON백업(일관된 프로젝트/기록/감사 스냅샷). 자동 복원·기존 데이터 덮어쓰기 없음.
- 기존 업무 필터는 /tasks/demo, 기존 대시보드는 /dashboard/demo에 보존. 원본 예산·일정·회의록·이메일 링크 및 로컬 HTML/Office는 그대로다.

## 데이터·안전 경계

21개 도메인은 people/milestones/tasks/hypotheses/products/scenarios/pilots/participants/surveyForms/surveys/payments/partners/interactions/estimates/allocations/expenses/expenseReviews/meetings/mentoring/aiUsage/evidence다. 관계는 정규화 링크 테이블과 동일 project_id 복합 FK, 필드 종류 검사로 보호한다. 입력명세가 폼/Zod/SQL 규칙에 공통 적용되며 동기화 검사를 제공한다. 물리적으로 각 도메인을 개별 테이블21개로 분리한 최종 모델은 아니며 공통 버전·JSONB 기록/링크를 사용하는 구현 단계다.

모든 일반 사용자의 직접 INSERT/UPDATE/DELETE 권한을 차단하고, 고정 search_path의 좁은 private 저장 함수에서 actor/project/role·입력·관계·version·재무 정정을 검사한다. 변경과 감사는 원자적이다. 개인정보/원본/증빙/환경값은 Git/public으로 복사하지 않았다. 운영 데이터를 localStorage나 공개 JSON에 대신 저장하지 않는다.

## 검증

lint·typecheck·Webpack production build·21페이지 smoke·PostgreSQL/계산/정책 테스트23개·API 통합·원본9개해시·브라우저 로그인/집계/폼등록/페이지재탐색/모바일 확인을 수행했다. 엔진을 닫았다 다시 열어 기록과 감사 유지도 통과했다. 상세 성공/실패/재검사와 사용자 필수12항목은 TEST_PLAN.md 참조.

API 통합은 실제 Next.js/SQL을 연결하되 Auth 응답은 로컬 테스트 게이트웨이에서 합성했다. 클라우드 JWT 갱신·버킷·signed URL 만료, 원격 RLS advisory, 운영 복원/재배포를 검증한 것으로 보고하지 않는다. 테스트 데이터는 테스트 전용 프로세스이며 앱/원격 운영 DB로 수입하지 않았다.

## 남은 사항

- 실제 Supabase 프로젝트 지정 및 기존 스키마 확인·백업 → 마이그레이션/계정/초기멤버십 → .env.local 연결 → 실제 Auth/Storage/RLS/복구검증이 필요하다. 연결 목록의 비활성 somssi 프로젝트는 변경하지 않았다.
- 공식 사업계획서/활동보고서 HWP와 최신 최종개정 DOCX·회사소개서의 실제 경로가 필요하다. 원본 없는 가격·팀원·실적을 추측하지 않았다.
- 공식 DOCX/XLSX 생성·실앱 열기·렌더/페이지 검증은 미구현. 생성5버튼 비활성 유지. CSV나 JSON백업을 공식 제출서류로 표현하지 않는다.
- 지출 신청/승인·기관 규정 자동판정, 결제 환불, Excel가져오기·기존외부앱 자동이관·자동복원·프로젝트초대/권한UI·실서비스배포는 미구현이다.
- 목록은 전체1,000건 이하를 지원하며 부분조회/개수불일치는 오류로 처리한다. 증빙 바이너리/Auth 계정은 JSON백업에 포함되지 않으며 운영 별도 백업과 복구 연습이 필요하다.

## 실행

README.md 및 V2_OPERATIONS_SETUP.md 참조. 환경 없이 npm run dev는 미연결 화면을 제공한다. 실제 저장은 서버 전용 SUPABASE_URL/PUBLISHABLE_KEY 및 프로젝트 행UUID 설정과 마이그레이션·계정/멤버십 설치 후 사용할 수 있다. service_role키는 필요 없다.

## 변경 파일

다음은 이번 기능 브랜치 작업의 전체 변경 파일이다. 작업 시작 전 존재한 SESSION_SUMMARY_2026-10-29.md는 수정·커밋하지 않는다.

- `.env.example`
- `.gitignore`
- `README.md`
- `apps/web/app/(main)/activities/page.tsx`
- `apps/web/app/(main)/ai-usage/page.tsx`
- `apps/web/app/(main)/budget/expenses/page.tsx`
- `apps/web/app/(main)/business-plan/page.tsx`
- `apps/web/app/(main)/dashboard/page.tsx`
- `apps/web/app/(main)/evidence/page.tsx`
- `apps/web/app/(main)/meetings/page.tsx`
- `apps/web/app/(main)/overview/page.tsx`
- `apps/web/app/(main)/partners/page.tsx`
- `apps/web/app/(main)/products/page.tsx`
- `apps/web/app/(main)/schedule/page.tsx`
- `apps/web/app/(main)/settings/page.tsx`
- `apps/web/app/(main)/tasks/demo/page.tsx`
- `apps/web/app/(main)/tasks/page.tsx`
- `apps/web/app/(main)/team/page.tsx`
- `apps/web/app/(main)/validation/page.tsx`
- `apps/web/app/api/auth/login/route.ts`
- `apps/web/app/api/auth/logout/route.ts`
- `apps/web/app/api/backup/route.ts`
- `apps/web/app/api/evidence/download/route.ts`
- `apps/web/app/api/evidence/upload/route.ts`
- `apps/web/app/api/records/route.ts`
- `apps/web/app/api/workspace/route.ts`
- `apps/web/app/globals.css`
- `apps/web/app/layout.tsx`
- `apps/web/app/login/page.tsx`
- `apps/web/components/operations/analytics.tsx`
- `apps/web/components/operations/evidence-manager.tsx`
- `apps/web/components/operations/live-dashboard.tsx`
- `apps/web/components/operations/login-form.tsx`
- `apps/web/components/operations/operational-page.tsx`
- `apps/web/components/operations/record-manager.tsx`
- `apps/web/components/operations/settings-controls.tsx`
- `apps/web/components/operations/workspace.tsx`
- `apps/web/components/shell.tsx`
- `apps/web/components/submission-clock.tsx`
- `apps/web/lib/navigation.ts`
- `apps/web/lib/operations/csv.ts`
- `apps/web/lib/operations/domains.ts`
- `apps/web/lib/operations/http.ts`
- `apps/web/lib/operations/projection.ts`
- `apps/web/lib/operations/validation.ts`
- `apps/web/lib/supabase/server.ts`
- `apps/web/package.json`
- `apps/web/tsconfig.json`
- `docs/DATA_MODEL.md`
- `docs/TEST_PLAN.md`
- `docs/V2_IMPLEMENTATION_PLAN.md`
- `docs/V2_OPERATIONS_REPORT.md`
- `docs/V2_OPERATIONS_SETUP.md`
- `package-lock.json`
- `package.json`
- `scripts/browser-smoke.js`
- `scripts/build-db-rules.mjs`
- `scripts/smoke.mjs`
- `supabase/migrations/20261029060302_somssi_operations.sql`
- `supabase/migrations/20261029061119_somssi_private_evidence.sql`
- `tests/operations-db.test.mjs`
- `tests/operations-integration.mjs`
- `tests/operations-persistence.test.mjs`
- `tests/operations-projection.test.mjs`
- `tests/operations-storage.test.mjs`
- `tests/support/supabase-fixture.mjs`
