# SOMSSI V2 개선·구현 계획

작성일 2026-10-29. 상위 기준은 SOMSSI_Codex_System_Architecture.md와 이번 V2 요청. 기존 main 자동 병합 금지. 기능별 feat/*에서 검사 후 push. 이 계획은 전체 V2 완료를 의미하지 않는다.

## 단계별 파일·작동 결과·완료 조건

| 사용자 단계 | 브랜치/주요 파일 | 구현 및 완료 조건 | 현재 상태 |
| --- | --- | --- | --- |
| 1 현행 분석 | feat/v2-analysis-baseline, CURRENT_SYSTEM_ANALYSIS.md | 전체 경로·예산 원본·저장 위치·양식 확보·이관 위험 조사 | 코드 조사 완료, 기존 실제 브라우저 데이터 미수집 |
| 2 기준 정비 | data/reference/v2.ts, V2_DATA_RECONCILIATION.md, /business-plan, /products | 사용자 제공 비전·60분 가설·자금 구분·출처/확인일·Q1–Q4, 최종 문서 수치 대조 | 사용자 기준 반영, 원본 미확보로 가격·실적 대조 대기 |
| 3 저장 기반 | feat/v2-auth-data, 서버 repository·migration·인가 | 사용할 프로젝트 확인 → 기존 DB 조사 → 별도 개발 환경·백업 → 멤버십/RLS → 변경/감사 원자 처리·version 충돌 → 복구 검사 | 미구현, 별도 somssi 체험 서비스와 혼용 금지 |
| 3 운영 연결 | feat/v2-validation-operations, /tasks·/validation·/activities·/partners·/meetings | 업무/가설/상품/설문/파일럿/결제/견적/파트너/멘토링/AI CRUD와 증빙, 업무 실제 완료일, 익명 집계/필터 | 공통 타입·계산 기반만 추가, CRUD 미구현 |
| 3 예산·정산 | feat/v2-expense-ledger, /budget/expenses | 세 자금별 비목/규정, 편성·신청·승인·실집행·정산 분리, 지출 정정과 감사 이력, 삭제 없음 | 미구현, 기존 배분표는 원본 링크 보존 |
| 4 공식 출력 | feat/v2-official-documents, services/docgen, /documents | 공식 HWP 확보·DOCX 변환 가능성 판정 → 원본 복제/매핑 → 스냅샷 → OOXML·XLSX 수식/서식 대조 → 전체 페이지 렌더/실앱 열기 | 원본 5종 안내 유지, 사업계획서·활동보고서 원본 없음, 모든 생성 미구현 |
| 5 현황 완성 | feat/v2-live-overview, /dashboard | 인증 repository 공통 데이터로 이번 주/지연·설문/결제·파트너·자금별 지출·준비도/누락 증빙 자동 표시 | 미연결 초기 화면·기존 데모 분리만 구현 |
| 6 검증 | 각 브랜치 TEST_PLAN.md + tests | 필수4검사+실제 기록 등록→재접속→문서 출력→데이터 일치, 권한·복구·예산 회귀 | 현 브랜치 검사 결과 TEST_PLAN 참조 |

단계 보고는 변경 파일/작동 결과/미완성을 함께 기록한다. 계획값·데모·원본 확보만으로 완료 상태를 부여하지 않는다.

## 데이터 계약과 다음 확장

현재 lib/v2/model.ts는 인증 저장소 도입 전의 부분 타입 계약이다. Source(source/checkedAt/status), projectId와 evidenceIds를 공통으로 둔다. Task, Hypothesis, ProductScenario, PilotSession, Payment, SurveyResponse, Partner, Expense, BudgetAllocation, Mentoring, AIUsage, CostEstimate, DocumentGeneration을 정의했다. 이 타입은 DB 제약·런타임 입력 검증·서버 권한을 대체하지 않는다.

기존 DATA_MODEL.md의 Project·Activity·Member·Evidence 모델을 유지하며 다음을 관계형 모델로 확장한다.

- Project → Milestone → Task; Task와 Hypothesis/Experiment/Activity 연결. 담당자·목표일·실제 완료일·증빙 연결.
- Product → ProductScenario → PilotSession → 익명 Participant/Payment. 회차 고정비·인당 변동비와 실제 Expense 구분. 성공/만족도는 응답 분모를 보관.
- Survey → SurveyResponse. 구매의향/예약문의/실결제는 독립 집계. 고객조사에는 질문/응답 정의와 표본 수/선정 방법 기록. CSV/XLSX는 스테이징·검증·미리보기 후 원자 가져오기, 개인정보 최소화.
- Partner → PartnerInteraction → 참여 회차/지급 Expense. LOI와 Contract의 증빙/유효일 구분. 외부 협력자와 팀원 별도.
- Meeting → 참석자/결정/Task/회의비 Expense. Mentoring은 별도 기록 후 Meeting·사업계획 수정·활동보고서 섹션 참조.
- AIUsage는 지원 프로그램 해당 여부와 실제 활용 여부를 분리. 전후 시간·비용·결과물·검수·한계 기록.
- BudgetAllocation과 Expense는 별도 테이블, fund_id별 집계/비목/규정 버전. 정정은 원거래 참조 추가분개+서버 감사 트랜잭션, 일반 UPDATE/DELETE API 제공하지 않음.
- DocumentTemplate 버전/해시/매핑 + DocumentGeneration 스냅샷/결과해시/렌더/페이지/검증. Mentoring/AIUsage/Expense/Pilot이 UI와 출력에서 동일 ID를 참조.

모든 주요 값의 출처는 구조화된 FK/버전으로 연결한다. 문자열 출처는 이번 기준 정비용이며 확정 제출물의 추적성을 보장하는 최종 구현이 아니다. 익명 집계 원본과 별도로 저장해야 할 연락처·영수증·서명은 private Storage+역할 제한+단기 URL을 적용한다.

## 이관·복구 게이트

기존 데이터를 overwrite/reset하지 않는다. 원 사이트 JSON/CSV 백업은 Git 외부에서 암호화 보관하고 해시/건수/총액을 대조한다. 원본 브라우저 상태를 유지하며 읽기 전용 수입 → 스테이징 오류/중복/상태 분류 → legacy ID 매핑 → 별도 새 프로젝트에 수입 → 합계 대조 → 복구 연습 순서다. 원본의 기본 주간회의·샘플 거래를 실적에 자동 수입하지 않는다. 운영 저장소를 결정하기 전 임시 localStorage/공개 JSON 쓰기로 대체하지 않는다.

## 이번 브랜치에서 제외된 완료 주장

- DB/Auth/RLS/감사·입력·저장·업로드·자동 문서 출력·백업 복구는 아직 작동하지 않는다.
- summarize는 순수 계산 함수이며 실제 결제 연동/환불 처리/정산 엔진이 아니다. future 계약 데이터와 부분 환불 정책은 저장 단계에 추가 검증이 필요하다.
- 본문10/5페이지·폰트 규칙은 사용자 제공 요구사항. 공식 양식과 DOCX 렌더로 확인하기 전 공식 제출 적합성으로 주장하지 않는다.
- 실데이터 저장소·최종 사업계획서·공식 HWP가 확인되면 해당 단계 작업을 이어간다.
