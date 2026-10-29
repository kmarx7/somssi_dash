# SOMSSI 2R Control Center — 로컬 저장

계정·Supabase·클라우드 키 없이 이 컴퓨터에 저장하는 Dashboard입니다. 기존 화면·계산·예산 원본 링크를 유지하고, 운영 기록은 서버 측 SQLite와 비공개 로컬 파일로 보관합니다.

## 실행

Node.js **22.16 이상**:

```sh
npm ci
npm run dev
```

http://127.0.0.1:3100/dashboard. 별도 환경설정이나 로그인이 필요 없습니다. 기본 저장 위치는 프로젝트 루트의 `.somssi-local/`이며 Git/public에서 제외합니다.

```text
.somssi-local/
├── store.sqlite           운영 기록·관계·감사 이력
├── store.sqlite-wal       실행 중 SQLite 트랜잭션 파일
├── store.sqlite-shm       실행 중 SQLite 공유 상태
└── evidence/              사진·영수증·서명 등 원본
```

이 컴퓨터를 사용하는 사람이 같은 운영 기록을 사용합니다. 다른 기기와 자동 동기화하거나 팀원별 계정/권한을 나누지 않습니다. 앱은 127.0.0.1에 바인딩하며 외부 Host/Origin의 데이터 요청은 차단합니다.

## 기능과 보존

업무·마일스톤·가설·상품·파일럿·조사·파트너·예산/지출·회의/멘토링·AI 기록과 공통 집계를 유지합니다. 저장과 감사 이력은 같은 로컬 DB 트랜잭션에 기록합니다. 지출·결제 완료·증빙 원본은 불변이며 거래 정정은 별도 분개로 남깁니다. 삭제 API는 없습니다.

증빙은 비공개 로컬 폴더에 저장하고 다운로드 때 크기/SHA-256을 검증합니다. 기존 예산 배분표·Office/HTML 원본은 변경하지 않았고, 기존 localStorage를 수입하거나 덮어쓰지 않습니다. 샘플은 `/dashboard/demo`, `/tasks/demo`에서만 표시합니다.

공식 DOCX/XLSX 생성·렌더·페이지 검증, 기관 규정 자동판정, 지출 신청/승인, 결제 환불, Excel 가져오기는 여전히 미구현입니다. 로컬 저장 전환이 해당 기능의 완성을 뜻하지 않습니다.

## 백업·복구

설정 화면의 **증빙 포함 전체 백업**은 DB·감사 이력·증빙 원본을 `.somssi-backup.gz`로 내려받습니다. 기록 JSON 내보내기는 증빙 바이너리를 포함하지 않습니다. 백업은 압축이며 암호화되지 않으므로 안전한 위치에 보관하세요.

```sh
npm run local:restore -- /path/backup.somssi-backup.gz /path/NEW-private-directory
```

복구 대상은 존재하지 않는 새 폴더여야 합니다. 해시·DB 무결성·기록/감사·증빙 일치를 검사하고 기존 폴더를 덮어쓰지 않습니다. 복구 폴더를 사용하려면 `apps/web/.env.local`에 `SOMSSI_DATA_DIR=/path/NEW-private-directory`를 지정하고 앱을 다시 시작합니다. 기본 위치를 쓰면 환경변수는 필요 없습니다.

## 검증

```sh
npm run lint
npm run typecheck
npm run build
npm run test:unit
npm run test:integration
npm run verify:originals
npm run start
# 실행 중인 서버 대상
npm run test:smoke
```

빌드와 타입검사는 Next 생성 파일을 공유하므로 순차 실행합니다. 통합 테스트는 임시 디렉터리의 **실제 SQLite·파일**을 사용하며 앱 프로세스 재시작과 전체 백업 복구까지 검사합니다. Node22의 SQLite 실험적 API 경고는 출력될 수 있습니다. 원본 검사는 로컬 원본이 있는 환경에서 실행합니다.

[로컬 저장·복구 상세](docs/LOCAL_STORAGE.md) · [테스트 결과](docs/TEST_PLAN.md) · [현행 분석](docs/CURRENT_SYSTEM_ANALYSIS.md) · [데이터 구조](docs/DATA_MODEL.md)

이전 Supabase 마이그레이션/설계 문서는 이력으로 남겨두며 현재 실행에서는 사용하지 않습니다. 기능 브랜치 `feat/local-storage`에서 검증 후 push하고 main에는 별도 요청 없이 병합하지 않습니다.
