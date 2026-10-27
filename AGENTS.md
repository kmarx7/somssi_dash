# SOMSSI 개발 원칙

- docs/SOMSSI_Codex_System_Architecture.md를 기준으로 단계별 구현한다.
- 사용자 요청: 기능 단위 feat/<feature> 브랜치로 분리하고 검증 후 push한다. main 병합은 별도 요청이 필요하다.
- 원본 DOCX/XLSX와 기존 예산 배분표의 디자인·계산·상호작용을 변경하지 않는다. 소스 미확보 시 링크만 제공한다.
- 원본 Office 파일·개인정보·증빙·서명·환경 비밀값은 Git/public에 올리지 않는다.
- 데모는 apps/web/data/demo에 분리하고 모든 샘플 화면에 명확히 표시한다. 미구현 API·인증·출력·승인을 작동하는 것처럼 표시하지 않는다.
- 지출 삭제 로직을 만들지 않는다. 거래 정정과 모든 변경은 서버 감사 이력이 필요하다.
- npm run lint, npm run typecheck, npm run build, npm run test:smoke를 실행하고 완료 범위를 docs/TEST_PLAN.md에 기록한다.
- Next.js API 변경은 설치 패키지 node_modules/next/dist/docs 및 공식 문서에서 확인한다.
