# SOMSSI Dashboard V2 현행 시스템 분석

조사일: 2026-10-29 (Asia/Seoul). 기준 커밋: 9a88ecc. 코드 변경 전 로컬 소스·설계·원본 목록을 조사했다. 과거 테스트 결과는 이번 실행 결과와 구분한다.

## 1. 결론과 보존 경계

현재 저장소는 M1 프론트엔드 데모다. 실제 지출·고객 응답·파일럿·팀원·증빙을 저장하는 서버/API/DB는 없다. 화면상의 400,000원 지출 및 업무 4건은 data/demo/project.ts의 샘플이며 실제 실적이 아니다. 업무 검색/상태 필터, 모바일 메뉴, 페이지 이동, 외부 원본 링크가 작동하는 범위다.

기존 예산 소스와 Office 원본은 확보되어 있다. 예산은 외부 링크 방식을 유지하고 reference-sources의 JS/CSS/HTML을 변경하지 않는다. 일정·회의·이메일의 기존 브라우저 데이터는 이 저장소에 들어 있지 않다. 이관 전 해당 사이트·동일 브라우저 프로필에서 백업이 필요하다.

## 2. 구조와 기술 스택

```text
apps/web/app/             Next.js App Router, 16개 사용자 화면
apps/web/components/      Shell, Icon, Panel/Badge/Notice, TaskList, FeaturePage
apps/web/data/demo/        합성 프로젝트·업무·마일스톤
apps/web/lib/navigation.ts 메뉴·단계·외부 URL
scripts/                  HTTP/브라우저 smoke, 원본 OOXML 조사·해시 검사
original-templates/       DOCX 4개 + XLSX 1개 (로컬 전용, Git 제외)
reference-sources/        기존 HTML 4개 + 참고 UI (로컬 전용, Git 제외)
docs/                     아키텍처·모델·필드매핑·디자인·검증·조사 메타데이터
```

npm workspace(apps/web). package-lock 고정: Next.js 16.4.3, React/React DOM 19.3.1, TypeScript ^5.9, Tailwind 4.3.3, ESLint 9. 현재 실행 Node 22.21.0. npm scripts는 루트에서 workspace에 위임한다. Python 스크립트는 zip/XML/hash 조사 용도이며 FastAPI 워커는 없다. Supabase·Zod·문서 생성 패키지는 아직 설치되지 않았다.

서버 컴포넌트가 정적 샘플을 표시하고 Shell과 TaskList만 클라이언트 상호작용을 담당한다. TaskList useState는 검색/상태 필터 전용이다. 전역 상태관리 라이브러리, 쓰기 API, Server Actions, 인증·세션·RLS·Storage·자동 저장·감사 이력은 없다. 별도 서버/마이그레이션/워커 폴더도 없다.

## 3. 모든 기존 화면과 작동 범위

| 경로 | 현재 범위 |
| --- | --- |
| / | /overview 307 이동 |
| /overview | 개요·예산 초기값·운영 흐름·개발 단계·바로가기 |
| /dashboard | 합성 금액·업무 진행률·마일스톤·데모 알림 |
| /tasks | 샘플 4건, 검색/상태 조합·빈 결과·초기화, 등록 비활성 |
| /schedule | 일정 기능 안내 + 기존 일정 URL |
| /activities | 활동 기능 안내, 등록 미구현 |
| /budget/allocate | 기존 예산 URL, iframe/복제/자동 동기화 없음 |
| /budget/expenses | 집행·승인·정정 기능 안내, 실제 거래 없음 |
| /meetings | 기존 회의록 URL, 통합 저장·DOCX 없음 |
| /evidence | 증빙 기능 안내, 업로드 미구현 |
| /documents | 로컬 원본 5종 안내, 생성 버튼 전부 비활성 |
| /team | 팀원 기능 안내, 실제 팀원 없음 |
| /partners | 제휴 기능 안내, 접촉/계약 집계 없음 |
| /communications | 기존 이메일 URL, 발송 기능 없음 |
| /validation | 가설·설문·파일럿 기능 안내 |
| /settings | M1–M6 구현 현황, 규정·권한 저장 미구현 |
| /login | 인증 미구현, 로그인 버튼 비활성 |

지출·회의 상세 및 알 수 없는 주소는 404. 공통 레이아웃: 236px 네이비 사이드바, 밝은 본문, 카드/패널/배지, 시스템 한글 글꼴. 800px 이하 details 메뉴, 키보드 초점·본문 바로가기. 현재 대비 불필요한 레이아웃·색상·컴포넌트 교체 필요 없음. 개선점은 샘플 실적과 운영 준비 화면의 구분, 출처/상태, 제출 준비도다.

## 4. 예산 배분 시뮬레이션 코드 확인

대상: reference-sources/somssi_budget.html, SHA-256 기준 docs/legacy-source-inventory.json. 코드 전체 확인. budget=200(만원), val 객체와 meetingCount/meetingPerPerson으로 계산한다. 저장소 사용 없음.

- 항목: 공간(최대60), 한복(30), 재료(35), 웹(65), 영상(40), 상표(50), 광고(30), AI(10), 회의(72), 여비(30), 단위 만원.
- 일반 항목 set(id,n): 0–항목 max 제한, 0.1만원 반올림; 슬라이더/숫자 입력 동기화.
- 회의: 참석 2명 고정 × 0–12회(정수) × 0–3만원(0.1단위). 일반 슬라이더와 별도 계산.
- render: 편성 합계, 잔액/초과액, 편성률, 진행 막대, 비목 합계, 항목별 잔액, 활동비(회의+여비) 경고.
- suggest/fit: 권장안 총200만원, 회의6회×2명×2.5만원=30만원. zero: 모두0.
- 복사·BOM CSV 다운로드. 새로고침하면 0으로 돌아감. 보존하려면 원본 CSV/복사 필요.
- 원본의 ‘집행률’ 표시는 편성액/200만원이다. 통합 실집행 통계에 수입하지 않는다. 원본 상한·경고는 운영기관 확정 규정이 아니다.

이전 조사에서 배포본 인라인 CSS/JS 일치와 권장안/초기화 동작을 확인했다. 이번 단계의 해시 검사는 변경 없음만 증명한다. 모든 경계값/CSV/클립보드/모바일 회귀가 재실행된 것으로 보고하지 않는다.

## 5. 기존 데이터와 손실 위험

| 도구 | 저장 위치 | 백업·복구 및 위험 |
| --- | --- | --- |
| 통합 M1 | data/demo/project.ts | 샘플만 존재, 필터 새로고침 시 초기화, 실제 데이터 유실 대상 없음 |
| 기존 예산 | 페이지 메모리 | 자동 저장 없음. 닫기/새로고침 전 CSV/복사 |
| 기존 일정 | 해당 Netlify origin localStorage: somssi_2r_calendar_v1 | JSON 내보내기 후 안전한 로컬 보관. 기존 가져오기는 전체 덮어쓰기이므로 원본 백업 선행 |
| 기존 회의록 | 해당 Netlify origin localStorage: SOMSSI_Meeting_2026_Records | JSON 백업. 초기 주간회의는 계획값; 인쇄는 공식 DOCX 생성 아님 |
| 기존 이메일 | 해당 origin localStorage: somssi-me, somssi-vals, somssi-selected, somssi-templates | JSON 내보내기의 포함 범위 확인. 성명/연락처 기본값은 별도 보존 필요. 개인정보 Git 금지 |
| 원본 Office/HTML | Git 제외 로컬 폴더 | 원본 파일을 재저장하지 않고 별도 암호화 백업. 저장소 clone만으로 복구 불가 |

브라우저의 origin/프로필/기기가 달라지거나 사이트 데이터가 삭제되면 기존 기록을 볼 수 없다. 서버 자동 백업·복구 없음. 기존 일정 import/reset과 참고 Control_Center HTML의 지출 삭제 로직은 새 시스템에 이식하지 않는다. 미리 기록된 값·양식의 예시 거래·성명은 실적이 아니다.

이관 절차: 원 사이트 JSON/CSV와 브라우저 저장값 백업 → 파일 해시/건수/금액 확인 → 새 스테이징 검증 → legacy_id 대응표로 중복 검사 → 새 ID·project_id 부여 → 사용자 확인한 실데이터만 가져오기 → 합계 대조 → 복구 연습. 원 사이트는 덮어쓰지 않는다. 백업은 Git/public 외부에 둔다.

## 6. 기준 자료 확보 상태

| 기준자료 | 프로젝트 내 확인 결과 |
| --- | --- |
| SOMSSI_1R_사업계획서_최종개정안_10페이지.docx | 없음. 가격·팀원·목표 수치를 추정하지 않음 |
| 모두의창업 2R 공식 사업계획서 HWP/HWPX | 없음. 정확한 공식 파일명 미확보 |
| 모두의창업 2R 공식 활동보고서 HWP/HWPX | 없음. 활동비 증빙 DOCX와 다른 문서 |
| 창업활동자금 집행 및 증빙 양식 | original-templates: XLSX 1종, DOCX 활동/회의/구매/참여 4종 확보 |
| SOMSSI 팀 회의록 | 회의록 DOCX와 기존 HTML 확보; 배포본과 HTML 차이 있음 |
| SOMSSI 회사소개서 | 프로젝트 내 없음, 과거 가격 확인 불가 |
| 실제 운영 데이터 | 프로젝트 내 없음, 기존 브라우저 저장값 미수집 |

2R 사업계획서 10쪽/활동보고서 5쪽, 본문 맑은고딕12pt/표10pt, 제출 2026-11-23 14:00은 이번 사용자 요청 기준이다. 공식 양식 확인 전 공식 규정 검증 완료로 표시하지 않는다. HWP→DOCX 변환 가능성 및 원본 비교는 파일 확보 후 판정한다.

연결된 Supabase의 목록을 읽기 전용으로 확인한 결과 somssi라는 비활성 프로젝트가 있다. 이 운영 Dashboard용인지 확인되지 않았고, DB 내용/키 조회·재개·변경하지 않았다. 기존 체험 서비스와 혼용하지 않는다.

## 7. 실행과 검증

Node >=22, npm ci → npm run dev → http://127.0.0.1:3100. 운영 빌드: npm run build → npm run start. 현재 단계에는 환경변수 필요 없음. .env.example은 주석만 있다.

필수: npm run lint, npm run typecheck, npm run build, 실행 중 서버 대상으로 npm run test:smoke. npm run verify:originals는 Office 5종과 기존 HTML4종 SHA-256 대조. 브라우저 smoke 스크립트는 HTTP 응답/샘플 표시/비활성 출력/404 검사이며 CRUD·영속성·Word 출력 검사가 아니다. 기존 TEST_PLAN의 결과는 과거 M1 기록이다. 이번 변경 결과는 별도 항목에 기록한다.

## 8. 우선 개선 계획

1. V2 기준값·자료 출처 목록·불일치/미확인 목록을 추가한다. 비전·60분 가설·성장4단계·자금3종을 사용자 제공 계획으로 표시한다.
2. 종합 현황은 샘플 금액 대신 미연결/0건을 명확히 표시한다. 기존 데모 대시보드는 별도 경로로 보존한다. Q1–Q4 및 상품·제출 준비 화면은 확보 자료와 미확인 값을 구분한다.
3. 공통 타입·읽기 전용 집계 함수를 준비하고, 실제 쓰기는 인증·프로젝트 경계·서버 감사·백업 후 구현한다. 상세 실행 순서와 파일 단위 작업은 V2_IMPLEMENTATION_PLAN.md를 따른다.
4. 최종 사업계획서·공식 HWP·회사소개서·실제 데이터 백업·사용할 DB 확인이 필요하다. 이 조건에 의존하는 가격 수입·운영 CRUD·공식 출력은 완료로 보고하지 않는다.

## 2026-10-30 자료 추가 확보

사용자 제공 `SOMSSI_1R_최종종합본.docx`를 확보하고 비공개 reference-sources 사본의 해시 동일성을 확인했다. 최초 조사에서 찾지 못한 `최종개정안_10페이지.docx`와 파일명은 다르지만 사용자 제공 최신 사업 내용 기준으로 Q1~Q4 목표·상품·가격 가설을 대조했다. 공식 제출 HWP 및 렌더/페이지 검증은 여전히 별도 필요하다. 자세한 대조·보존 범위는 FINAL_PLAN_ALIGNMENT.md 참조.
