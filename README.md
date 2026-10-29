# SOMSSI 2R Control Center

모두의창업 SOMSSI 팀 운영 통합 시스템의 **V2 현행 분석·기준 정비 단계**입니다. 실제 계정·지출·파일을 저장하지 않습니다. 기존 M1 데모 대시보드는 `/dashboard/demo`, 업무 데모는 `/tasks`에서 보존합니다. 기본 `/dashboard`는 실제 데이터 미연결 상태를 표시합니다.

## 실행

Node.js 22 이상과 npm을 사용합니다.

```sh
npm ci
npm run dev
```

http://127.0.0.1:3100 에서 확인합니다. 루트는 `/overview`로 이동합니다. M1에는 환경변수나 외부 계정이 필요 없습니다.

```sh
npm run lint
npm run typecheck
npm run build
npm run start
# 실행 중인 서버를 대상으로 별도 터미널에서
npm run test:smoke
npm run test:unit
# 원본 5개가 로컬 original-templates에 있을 때
npm run verify:originals
```

## 구현 범위

- Next.js App Router / React / TypeScript / Tailwind 기반 기존 레이아웃 유지, 19개 사용자 화면.
- `/business-plan`: Q1–Q4·비전·성장 단계·원본 확보 목록. `/products`: 60분/120분 상품 가설, 미확인 가격 표시.
- 제출시각(2026-11-23 14:00 KST) 카운트다운, 데모와 운영 현황 분리, 출처/확인일·자금 구분.
- 인증 저장소 도입 전 공통 타입 및 순수 집계/공헌이익 계산 함수. 실제 CRUD/DB 연동은 미구현.
- 개요·대시보드, 데모 업무 검색/상태 필터/빈 결과/필터 초기화.
- 데스크톱 사이드바·모바일 접기 메뉴·키보드 초점·본문 바로가기.
- 기존 일정·예산·회의록·이메일 앱 외부 연결.
- 원본 문서 5종 목록, 미구현 기능·데모·서버 미연결 표시, 알 수 없는 경로 404.

로그인·DB/RLS·데이터 CRUD·지출 승인/정산·증빙 업로드·문서 생성/다운로드·실시간 협업·배포는 미구현입니다. 지출/회의 상세 경로는 데이터 연동 단계에서 추가합니다. 현재는 404를 반환합니다.

## 보존 원칙

기존 예산 배분표를 재구현하지 않고 원본 링크만 제공합니다. 공식 DOCX/XLSX는 로컬 `original-templates`에 그대로 복사했고 바이너리·참고 HTML은 Git/public에서 제외합니다. 문서 조사는 OOXML 읽기 수준이며 원본 렌더 비교와 생성 검증은 M5에서 수행합니다.

실제 수치와 인물은 수집하지 않았으며 샘플은 `apps/web/data/demo`에 분리했습니다. 브라우저 localStorage/쿠키에 저장하지 않습니다. 원본 양식의 예시 거래·성명은 조사 자료이며 실데이터로 수입하지 않습니다.

## 문서

- [V2 현행 분석](docs/CURRENT_SYSTEM_ANALYSIS.md)
- [V2 개선 계획·단계별 상태](docs/V2_IMPLEMENTATION_PLAN.md)
- [V2 기준값과 미확인 목록](docs/V2_DATA_RECONCILIATION.md)
- [이번 단계 변경 보고](docs/V2_CHANGE_REPORT.md)
- [원 아키텍처](docs/SOMSSI_Codex_System_Architecture.md)
- [조사 결과·확정 요구사항·미확정 항목](docs/REQUIREMENTS.md)
- [데이터 흐름·ERD·금액 의미·권한 설계](docs/DATA_MODEL.md)
- [원본 필드매핑 후보·검증 계획](docs/DOCUMENT_MAPPING.md)
- [마일스톤·기능별 브랜치 계획](docs/IMPLEMENTATION_PLAN.md)
- [디자인 기준](docs/DESIGN_SYSTEM.md)
- [테스트 결과 및 다음 검증](docs/TEST_PLAN.md)

기능별 `feat/<기능명>` 브랜치로 분리합니다. 이번 V2 기준 정비는 `feat/v2-analysis-baseline`이며 main 자동 병합은 하지 않습니다.
