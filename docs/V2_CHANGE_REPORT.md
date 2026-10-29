# V2 1차 변경 보고

기준일: 2026-10-29. 작업 브랜치 feat/v2-analysis-baseline. main에 병합하지 않는다.

## 완료 및 미완성

1단계: 전체 저장소·기술·경로·예산코드·데이터 저장/백업·원본 확보 상태 분석 완료. 실제 기존 사이트 사용자 기록은 미수집.

2단계: 사용자 제공 비전/성장4단계/상품60분 가설/제출시각/자금3종/출처·확인일 반영. 원본 없는 가격·원가·정원·팀원·실적은 미입력. 최종 사업계획서와의 실제 문장/수치 대조는 대기.

3단계 준비: 공통 부분 타입과 순수 집계/공헌이익 함수, 의미 분리 단위 테스트. 실제 입력·저장·서버 감사·권한·파일 연결 미구현.

4단계: 출력 기능 미구현. 기존 DOCX4종/XLSX1종 보존, 공식 사업계획서/활동보고서 미확보 명시. 생성·실앱 열기·렌더·페이지 검사는 미실행.

5단계 준비: 기본 /dashboard에서 데모 실적 배제·빈 기록·데이터 미연결 표시, 제출시간 카운트다운. 기존 화면 /dashboard/demo 보존. 실제 통계/주간 업무/증빙 누락/문서 준비율은 DB 연결 후 완성.

6단계: 이번 변경의 lint/typecheck/build/unit/smoke/원본 해시 및 브라우저 회귀 검사. 상세 결과와 미검증12항목은 TEST_PLAN.md 참조.

## 변경 파일과 작동 결과

| 파일/폴더 | 변경 내용 |
| --- | --- |
| docs/CURRENT_SYSTEM_ANALYSIS.md | 코드 변경 전 현행 분석 |
| docs/V2_IMPLEMENTATION_PLAN.md | 단계·브랜치·파일·모델·이관/복구 게이트 |
| docs/V2_DATA_RECONCILIATION.md | 코드/요청 차이, 출처, 미확인/미확보 |
| docs/TEST_PLAN.md, V2_CHANGE_REPORT.md | 이번 단계 검증·제약·보고 |
| apps/web/data/reference/v2.ts | 공개 가능한 사용자 계획 기준과 원본 목록, 가격/개인정보 없음 |
| apps/web/data/reference/operating-data.ts | 명시적 disconnected 빈 데이터, 쓰기·자동 데모 seed 없음 |
| apps/web/lib/v2/model.ts, metrics.ts | 도메인 부분 타입·프로젝트 범위 집계·공헌이익·마감 함수 |
| apps/web/app/(main)/dashboard/page.tsx | 미연결 준비 현황·샘플 수치 배제 |
| apps/web/app/(main)/dashboard/demo/page.tsx | 기존 데모 대시보드 그대로 보존 |
| apps/web/app/(main)/business-plan/page.tsx | Q1–Q4·비전/성장·자료 확보 상태 |
| apps/web/app/(main)/products/page.tsx | 60분/120분 가설·미확인 가격/원가 구분 |
| apps/web/app/(main)/overview/page.tsx | 인천 비전·기본자금·기준 정비 설명 |
| apps/web/app/(main)/documents/page.tsx | 미확보2R양식·출력/렌더 미구현 명시 |
| apps/web/app/(main)/settings/page.tsx | V2 현재 범위 안내 |
| apps/web/app/layout.tsx, components/shell.tsx | 메타/전역 데이터상태, 샘플 경로 표시 |
| apps/web/components/submission-clock.tsx | 한국시간 마감·분 단위 재계산, 타이머 해제 |
| apps/web/lib/navigation.ts | 기존 메뉴 유지 + 사업계획/상품 연결 |
| tests/v2-metrics.test.mjs, package.json | Node 기본 테스트 실행, 신규 패키지 없음 |
| scripts/smoke.mjs, scripts/browser-smoke.js | 기존 HTTP검사 + 새 경로/데모 분리 |
| README.md | 실행·범위·설계/보고 링크 |

기존 CSS, 원본 예산·일정·회의록·이메일 HTML, Office 바이너리는 변경하지 않았다. 작업 시작 전 존재한 SESSION_SUMMARY_2026-10-29.md는 이번 커밋에 포함하지 않는다.

## 데이터와 실행

실제 운영 저장소 없음. data/reference는 사용자 계획/확보 상태이며 DB나 사용자 데이터 백업이 아니다. data/demo는 기존 샘플로 유지. lib/v2 모델은 향후 서버 repository 계약의 일부이며 런타임 입력 검증/인가/감사/DB 무결성을 대신하지 않는다. 이관 전 원 사이트 브라우저에서 백업한다. 인증 저장소 확인 전 임시 localStorage나 공개 JSON 저장으로 대체하지 않는다.

Node>=22, npm ci, npm run dev. 기본 주소 http://127.0.0.1:3100/overview. npm run lint, npm run typecheck, npm run build, npm run test:unit. npm run start 후 npm run test:smoke. 별도 포트는 npm run start --workspace @somssi/web -- --port 3102와 SMOKE_BASE_URL=http://127.0.0.1:3102 npm run test:smoke. 원본이 있는 환경은 npm run verify:originals.

## 다음 단계에 필요한 자료

- SOMSSI_1R_사업계획서_최종개정안_10페이지.docx의 실제 경로.
- 공식 2R 사업계획서·활동보고서 HWP/HWPX의 실제 파일명/경로. DOCX 변환 후 공식 제출 적합성과 렌더 검증 필요.
- SOMSSI 회사소개서 경로, 기존 사이트 일정/회의/이메일 백업, 실제 실증·거래 자료.
- 운영 Dashboard용 저장 프로젝트 지정. 연결 목록의 somssi 프로젝트는 비활성이며 이번 운영앱용인지 확인되지 않았으므로 변경하지 않음.
- 집행규칙/승인권자/규정 버전과 팀 초대 사용자. 개인정보·원본·증빙·비밀값은 계속 Git/public 제외.
