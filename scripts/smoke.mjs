import assert from "node:assert/strict";
const base = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3100";
const routes = [
  ["/overview", "실행부터 제출까지"],
  ["/dashboard", "오늘의 실행"],
  ["/dashboard/demo", "오늘의 실행"],
  ["/business-plan", "사업계획·가설"],
  ["/products", "가야금 상품"],
  ["/tasks/demo", "업무·마일스톤 데모"],
  ["/ai-usage", "AI 솔루션 활용"],
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
  ["/login", "팀 계정 로그인"],
];
for (const [path, text] of routes) {
  const response = await fetch(base + path, {
    signal: AbortSignal.timeout(30_000),
  });
  assert.equal(response.status, 200, path);
  const html = await response.text();
  assert.ok(html.includes(text), `${path}: expected page content`);
  assert.ok(
    html.includes("데모") ||
      html.includes("연결") ||
      html.includes("팀 계정 로그인"),
    `${path}: data disclosure required`,
  );
  assert.ok(
    !html.includes("service_role"),
    `${path}: no service key reference`,
  );
  if (path === "/dashboard") {
    assert.ok(html.includes("실제 운영 데이터 저장소가 연결되지 않았습니다"));
    assert.ok(html.includes("확인 필요"));
    assert.ok(
      !html.includes("400,000원"),
      "Synthetic expenses must not appear in operational dashboard",
    );
    assert.ok(html.includes("/dashboard/demo"));
  }
  if (path === "/dashboard/demo") assert.ok(html.includes("400,000원"));
  if (path === "/products")
    assert.ok(html.includes("최종개정 사업계획서가 없어"));
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
const root = await fetch(base, { redirect: "manual" });
assert.equal(root.status, 307);
assert.equal(root.headers.get("location"), "/overview");
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
console.log("PASS root redirect; 21 pages; 5 missing/private paths");
for (const path of [
  "/api/workspace",
  "/api/backup",
  "/api/evidence/download?id=11111111-1111-4111-8111-111111111111",
]) {
  const response = await fetch(base + path);
  assert.ok(
    [401, 403, 503].includes(response.status),
    `${path}: unauthenticated or unconfigured requests must fail closed`,
  );
  assert.ok(response.headers.get("cache-control")?.includes("no-store"));
  const body = await response.json();
  assert.ok(
    !body.records && !body.url,
    `${path}: no private data or signed URL`,
  );
  console.log("PASS protected", path);
}
const write = await fetch(base + "/api/records", {
  method: "POST",
  headers: { Origin: base, "Content-Type": "application/json" },
  body: "{}",
});
assert.ok(
  [401, 403, 503].includes(write.status),
  "Unauthenticated write must be denied",
);
assert.equal(
  (await fetch(base + "/api/records", { method: "DELETE" })).status,
  405,
);
console.log("PASS unauthenticated write denied; DELETE unavailable");
