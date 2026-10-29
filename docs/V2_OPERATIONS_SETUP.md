# V2 운영 저장소 연결

기준일: 2026-10-30. 이번 코드는 기존 Next.js 앱과 Supabase 설계를 사용한다. 실제 사용할 Supabase 프로젝트는 아직 지정되지 않았으며 원격 스키마/사용자/데이터를 변경하지 않았다. 연결 목록의 비활성 `somssi`가 별도 체험 서비스용인지 확인되지 않았으므로 자동 재개·혼용하지 않는다.

## 1. 연결 전 확인

운영 Dashboard용 Supabase 프로젝트를 지정한다. 기존 DB가 있다면 테이블/정책/버킷과 백업 상태를 먼저 확인한다. 이번 마이그레이션은 somssi_ 접두 테이블을 추가하며 기존 테이블을 수정·삭제하지 않는다. 동일 이름 테이블/버킷이 있으면 적용 전에 비교한다. 실제 데이터·원본 Office·증빙·연락처·서명은 Git/public에 올리지 않는다.

## 2. 마이그레이션과 계정

공식 SQL Editor 또는 조직의 마이그레이션 절차로 다음 두 파일을 순서대로 적용한다.

1. `supabase/migrations/20261029060302_somssi_operations.sql`: 프로젝트/멤버십/버전 기록/프로젝트 내부 참조/감사, RLS, 검증·저장 RPC, 백업 RPC.
2. `supabase/migrations/20261029061119_somssi_private_evidence.sql`: 비공개 somssi-evidence 버킷, 업로드·열람 정책. 파일 덮어쓰기·삭제 권한 없음.

관리자는 Supabase Auth에서 이메일/비밀번호 계정을 만든다. 앱에서는 가입·초대/이메일 자동 발송을 제공하지 않는다. 이후 관리자 SQL 세션에서 프로젝트와 초기 owner 멤버십을 한 트랜잭션으로 만든다. 아래 UUID 자리에는 실제 Auth 사용자 UUID만 사용한다. SQL Editor 화면/결과에 비밀번호나 키를 입력하지 않는다.

```sql
begin;
with project as (
  insert into public.somssi_projects(name) values ('SOMSSI 2R') returning id
)
insert into public.somssi_project_members(project_id,user_id,role)
select id, '<AUTH_USER_UUID>'::uuid, 'owner' from project
returning project_id;
commit;
```

반환된 project_id를 앱의 SOMSSI_PROJECT_ID에 설정한다. 이것은 Supabase 클라우드 프로젝트 ref가 아니라 새 somssi_projects 행의 UUID다. 멤버 추가/역할 변경은 관리자 SQL로 수행하며 서버 감사 트리거가 기록한다. 앱에서 자기 권한을 변경할 수 없다. editor는 자신이 만든 기록만 수정하며, 지출 정산 검토는 owner/admin만 작성한다. 결제 완료·지출·증빙 원본은 불변이다.

## 3. 로컬 연결 설정

루트 .env.example을 `apps/web/.env.local`로 복사하고 다음 서버 전용 값만 입력한다.

```dotenv
SUPABASE_URL=<프로젝트 API URL>
SUPABASE_PUBLISHABLE_KEY=<publishable key>
SOMSSI_PROJECT_ID=<운영 프로젝트 행 UUID>
```

service_role/secret key는 필요 없다. 브라우저로 키를 내보내지 않는다. 서버 Route Handler에서만 Supabase 클라이언트를 생성하고 검증된 로그인 사용자의 토큰과 RLS를 사용한다. 인증 쿠키는 HttpOnly/SameSite=Lax, 운영 HTTPS에서는 Secure로 설정한다. 로그인·로그아웃/쓰기 요청은 Origin과 Host를 비교한다.

```sh
npm ci
npm run dev
```

http://127.0.0.1:3100/login 에서 로그인한다. 설정 누락은 503 미연결, 미로그인은 401, 비멤버는 403으로 표시한다. 등록 성공은 DB 트랜잭션과 감사 기록 성공 이후에만 표시된다. 저장소 장애가 나면 임시 localStorage로 대신 저장하지 않는다.

## 4. 운영 시작 순서

1. 팀원/외부 협력자 등록 → 상품 → 상품 시나리오 → 파일럿 → 익명 참가자/실제 결제.
2. 조사 설계 → 익명 고객 응답. 구매의향/예약문의는 실제 결제와 별도다.
3. 업무·가설·마일스톤·회의·멘토링·AI 활용을 출처/확인일/검증 상태와 함께 등록한다.
4. 증빙 업로드 → 각 기록의 연결 증빙에서 선택한다. 파일은 private 버킷에 저장되며 직접 공개 URL을 만들지 않는다. 다운로드는 권한 재확인 후 60초 링크로 제공한다.
5. 예산 편성과 실제 집행을 각각 등록한다. 원본 슬라이더 배분표는 수정하거나 자동 수입하지 않는다. 1R/AI/향후 자금별 비목과 실제 금액을 분리한다.
6. 지출 오류는 동일 자금/비목/거래처/회차의 원거래를 참조해 증감액/사유로 정정한다. 원거래를 지우거나 덮어쓰지 않는다. 과다 역분개는 DB에서 차단한다. 원거래와 모든 정정의 정산 검토가 완료돼야 정산액에 포함된다.

파일럿 회차 손익은 실제 결제 합계 − 연결 지출 순액이며, 상품 비교 손익은 가격×비교 인원 − 회차 고정비 − 인당 변동비×인원이다. 미입력 가격/원가는 0으로 가정하지 않는다. 회차 성공/만족도는 실제 분모가 있을 때만 계산한다.

## 5. 백업과 복구 범위

설정의 JSON 백업은 owner/admin만 가능하다. 한 SQL 스냅샷에서 프로젝트/기록/감사 이력을 내보낸다. CSV는 현재 목록을 내보내며 공식 XLSX 양식을 대신하지 않는다. JSON에는 실제 입력값이 포함되므로 비공개·암호화 보관한다.

JSON에는 Storage 파일 바이너리와 Auth 계정이 포함되지 않는다. 운영 전 제공자의 DB 백업/PITR와 private Storage 별도 백업을 설정하고 실제 복구를 연습해야 한다. JSON 자동 덮어쓰기/복원은 구현하지 않았다. 실서비스 복구 완료로 주장하지 않는다. PostgreSQL 엔진을 닫고 같은 데이터 디렉터리로 다시 여는 기록/감사 영속성 테스트는 별도로 수행한다.

기존 외부 앱의 브라우저 localStorage는 자동 이관하지 않는다. 원 사이트·동일 브라우저에서 JSON/CSV를 먼저 백업하고, 원본을 보존한 채 별도 스테이징/중복·합계 검사 후 가져오기 구현을 진행한다.

## 6. 검증과 제한

```sh
npm run lint
npm run typecheck
npm run build
npm run test:unit
npm run test:integration
npm run db:rules:check
npm run verify:originals
# npm run start 실행 후
npm run test:smoke
```

통합 테스트는 합성 Auth 응답을 제공하는 localhost 테스트 게이트웨이와 실제 PostgreSQL 엔진(PGlite)을 이용한다. 실제 클라우드 Auth/Storage signed URL/네트워크/운영 DB에 대한 검증을 대체하지 않는다. 테스트 자격값·데이터는 테스트 프로세스 안에서만 사용하며 앱에는 우회 로그인 경로가 없다.

- 운영 목록 1,000건을 초과하거나 전체 조회 개수가 불일치하면 부분 합계 대신 오류를 표시한다. 대규모 커서 페이징은 미구현이다.
- 파일 최대10MB, PDF/PNG/JPG/WebP/DOCX/XLSX 지원. 영상 업로드/바이러스 검사/OCR 미구현. 바이너리를 attachment로 내려받고 공개 인라인 렌더링하지 않는다.
- 파일 저장 후 DB 등록 실패 시 비공개 orphan 파일 ID를 오류에 표시한다. 성공으로 보고하지 않으며 관리자 정리가 필요하다.
- 실제 결제의 환불·카드/은행 연동, 지출 신청/승인·기관 규정 자동 판정은 미구현이다.
- Excel 가져오기, 대량 복원, 공식 문서 생성·렌더·페이지 검증은 미구현이다. 최종개정 DOCX/공식 HWP 원본을 아직 받지 못했다.
- 환경 제약으로 Turbopack PostCSS 내부 포트 바인딩이 실패하여 build 스크립트에 공식 --webpack 옵션을 적용했다. 프레임워크와 CSS 디자인은 유지한다.

참고: [Supabase 서버 인증](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Storage 정책](https://supabase.com/docs/guides/storage/security/access-control), [Next.js Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route), [쿠키](https://nextjs.org/docs/app/api-reference/functions/cookies). 설치 Next.js의 node_modules/next/dist/docs와 설치된 SSR 타입도 확인했다.
