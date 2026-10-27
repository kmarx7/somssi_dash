(async () => {
  const assert = {
    equal(a, b, msg = "equality") {
      if (a !== b) throw new Error(msg + ": " + a + " !== " + b);
    },
    ok(value, msg = "assertion") {
      if (!value) throw new Error(msg);
    },
  };
  const results = [];
  const console = {
    log(...parts) {
      results.push(parts.join(" "));
    },
  };
  const base = location.origin;
  const routes = [
    ["/overview", "실행부터 제출까지"],
    ["/dashboard", "오늘의 실행"],
    ["/schedule", "실행 일정"],
    ["/activities", "사업 활동"],
    ["/tasks", "업무·마일스톤"],
    ["/budget/allocate", "예산 배분표"],
    ["/budget/expenses", "집행·정산 관리"],
    ["/meetings", "팀 회의록"],
    ["/evidence", "증빙 파일"],
    ["/documents", "공식 문서 출력"],
    ["/team", "팀원 관리"],
    ["/partners", "제휴처 관리"],
    ["/communications", "이메일 템플릿"],
    ["/validation", "성과·파일럿"],
    ["/settings", "프로젝트 설정"],
    ["/login", "로그인 미구현"],
  ];
  for (const [path, text] of routes) {
    const response = await fetch(base + path, {
      signal: AbortSignal.timeout(30_000),
    });
    assert.equal(response.status, 200, path);
    const html = await response.text();
    assert.ok(html.includes(text), `${path}: expected page content`);
    assert.ok(html.includes("데모"), `${path}: demo disclosure required`);
    assert.ok(
      !html.includes("service_role"),
      `${path}: no service key reference`,
    );
    if (path === "/budget/allocate") {
      assert.ok(
        html.includes("https://coruscating-duckanoo-f67d1c.netlify.app/"),
      );
      assert.ok(!html.includes("<iframe"), "M1 only links to budget original");
    }
    if (path === "/documents") {
      assert.equal(
        (html.match(/<button[^>]*disabled/g) || []).length,
        5,
        "All five generators must be disabled",
      );
    }
    console.log("PASS", path);
  }
  const root = await fetch(base);
  assert.equal(new URL(root.url).pathname, "/overview");
  for (const path of [
    "/not-a-page",
    "/budget/expenses/unknown",
    "/meetings/unknown",
    "/original-templates/activity_evidence.docx",
    "/reference-sources/SOMSSI_2R_Control_Center.html",
  ]) {
    const response = await fetch(base + path);
    assert.equal(response.status, 404, path);
    console.log("PASS 404", path);
  }
  console.log("PASS root redirect; 16 pages; 5 missing/private paths");

  return results;
})();
