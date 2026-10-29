# SOMSSI 2R Control Center

기존 Dashboard를 확장한 V2 운영 관리 앱입니다. Next.js/React/TypeScript와 기존 디자인·예산 원본 링크를 유지합니다. 실제 저장은 **Supabase 로그인·멤버십·마이그레이션 연결 후** 사용할 수 있습니다. 환경설정이 없으면 미연결 상태와 비활성 등록 버튼을 표시합니다.

## 실행

Node.js22 이상:

```sh
npm ci
npm run dev
```

http://127.0.0.1:3100/overview. 실제 저장소와 계정 연결은 [운영 설치·권한·백업 절차](docs/V2_OPERATIONS_SETUP.md)를 따릅니다. 서버 전용 SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SOMSSI_PROJECT_ID가 필요하며 service_role/secret key는 사용하지 않습니다.

```sh
npm run lint
npm run typecheck
npm run build
npm run test:unit
npm run test:integration
npm run db:rules:check
npm run verify:originals
npm run start
# 실행 중 서버 대상
npm run test:smoke
```

빌드는 환경의 Turbopack 내부 포트 생성 제약 때문에 공식 Webpack 옵션을 사용합니다. 원본 검사는 로컬 original-templates/reference-sources가 있는 환경에서 실행합니다. 테스트 전용 PGlite는 런타임 저장소가 아니라 PostgreSQL/RLS 검사에만 사용합니다. API 통합 테스트는 합성 Auth 게이트웨이와 실제 PostgreSQL 엔진을 사용하며 운영 클라우드 인증/파일 검증을 대신하지 않습니다.

## 구현 범위

- 이메일/비밀번호 로그인·HttpOnly 쿠키·로그아웃, 프로젝트 멤버십·owner/admin/editor/viewer 권한/RLS.
- 업무·마일스톤·가설·팀원/협력자·상품/시나리오·파일럿/익명 참가자/결제·조사 설계/응답·파트너/접촉·견적·회의/멘토링·AI 활용 입력/수정·출처/확인일/상태/증빙 연결.
- 자금별 편성·실집행·정정 분리, 거래 삭제 없음, 결제 완료/지출 원본 불변, 서버 감사 트랜잭션과 버전 충돌 감지.
- 실제 등록 기록 기반 Dashboard 집계·회차 손익/성취/만족도, 가격/원가 시나리오 비교, 설문 분석.
- 비공개 증빙 업로드·권한 재확인·60초 다운로드, 관리자 JSON백업, 목록별 CSV 내보내기.
- 기존 예산·일정·회의록·이메일 원본 링크 보존. 기존 샘플 대시보드 `/dashboard/demo`, 업무 필터 `/tasks/demo` 보존.
- Q1–Q4/비전/성장4단계, 초기60분·120분 가설과 미확보 원본 목록. 자료 없는 가격·인원·실적은 임의 생성하지 않음.

원격 운영 프로젝트는 아직 지정되지 않았으며 DB/Auth/버킷을 원격에 적용하지 않았습니다. 공식 DOCX/XLSX 생성·렌더·페이지 검증, 기관 규정 자동판정, 지출 신청/승인, 환불, Excel 가져오기, 자동 복원·실서비스 배포는 아직 완료되지 않았습니다. 공개 페이지 존재나 코드 구현만으로 실운영 검증 완료를 뜻하지 않습니다.

## 보존·개인정보

원본 Office5종과 HTML4종은 로컬 전용이며 Git/public에 포함하지 않습니다. 예산의 디자인/계산/슬라이더를 변경하거나 편성값을 실지출로 가져오지 않습니다. 기존 브라우저 localStorage를 읽거나 덮어쓰지 않습니다. 데모와 실제 기록을 수입·혼합하지 않습니다. 실데이터·백업·서명·영수증·비밀값은 Git 밖에서 보관하세요.

## 문서

- [현행 분석](docs/CURRENT_SYSTEM_ANALYSIS.md), [V2 개선 계획](docs/V2_IMPLEMENTATION_PLAN.md), [기준값·불일치 목록](docs/V2_DATA_RECONCILIATION.md)
- [이번 운영 구현 보고](docs/V2_OPERATIONS_REPORT.md), [연결 방법·제약](docs/V2_OPERATIONS_SETUP.md), [테스트 결과](docs/TEST_PLAN.md)
- [원 아키텍처](docs/SOMSSI_Codex_System_Architecture.md), [데이터 구조](docs/DATA_MODEL.md), [원본 필드매핑](docs/DOCUMENT_MAPPING.md), [디자인 기준](docs/DESIGN_SYSTEM.md)

기능 브랜치 `feat/v2-operations-storage`에서 검증 후 push하며 main에는 별도 요청 없이 병합하지 않습니다.
