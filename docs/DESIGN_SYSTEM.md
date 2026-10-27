# M1 화면 기준

참고 HTML의 네이비 사이드바와 밝은 본문 구조를 사용한다. 배분표 자체는 변경하지 않는다.

- 배경 #f5f6fa, 본문 #17233e, 보조 #66738a, 브랜드 #4158c8, 사이드바 #17223d, 테두리 #e4e8f0.
- 시스템 한글 글꼴, 본문 14px, 제목 28px, 숫자는 tabular-nums. 외부 폰트 로딩 없음.
- 사이드바 236px, 콘텐츠 최대 1320px, 패널 간격 20px, 패널 반경 12px.
- 전역 ‘M1 프론트엔드 · 데모’와 ‘샘플 데이터 · 저장되지 않음’을 유지. 알림과 위험도에도 데모 맥락 유지.
- ‘미구현’ ‘원본 연결’ ‘데모’ 상태를 색상과 텍스트로 구분. 승인·생성·업로드 버튼 disabled와 이유를 함께 표시.
- 800px 이하에서는 details 기반 모바일 메뉴, 이동 후 닫힘. body 가로 넘침 없이 테이블만 스크롤.
- 공통 패널·상태 배지·헤더·외부 연결 카드. 실제 링크는 Link/a, 로컬 필터는 button/input. aria-current, aria-label, :focus-visible, skip link 지원.

기반 구성: [Next.js 공식 설치 문서](https://nextjs.org/docs/app/getting-started/installation), [Tailwind PostCSS](https://tailwindcss.com/docs/installation/using-postcss). 설치 버전은 package-lock.json으로 고정한다.
