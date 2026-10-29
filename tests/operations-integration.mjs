import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { startFixture, fixtureProject } from "./support/supabase-fixture.mjs";
import { fieldsFor } from "../apps/web/lib/operations/domains.ts";
import { toOperatingData } from "../apps/web/lib/operations/projection.ts";
import { summarize } from "../apps/web/lib/v2/metrics.ts";
const fixture = await startFixture();
const port = 3110,
  base = `http://127.0.0.1:${port}`;
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "apps/web",
    "--hostname",
    "127.0.0.1",
    "--port",
    String(port),
  ],
  {
    env: {
      ...process.env,
      SUPABASE_URL: "http://127.0.0.1:54329",
      SUPABASE_PUBLISHABLE_KEY: "fixture-publishable-key",
      SOMSSI_PROJECT_ID: fixtureProject,
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let logs = "";
server.stdout.on("data", (d) => (logs += d));
server.stderr.on("data", (d) => (logs += d));
let cookie = "";
async function call(path, method = "GET", body) {
  const response = await fetch(base + path, {
    method,
    headers: {
      Origin: base,
      ...(cookie ? { Cookie: cookie } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const cookies = response.headers.getSetCookie();
  if (cookies.length) cookie = cookies.map((c) => c.split(";")[0]).join("; ");
  return {
    status: response.status,
    headers: response.headers,
    body: await response.json(),
  };
}
const values = (kind, overrides) =>
  Object.fromEntries(
    fieldsFor(kind).map((f) => [
      f.key,
      Object.hasOwn(overrides, f.key)
        ? overrides[f.key]
        : f.type === "refs"
          ? []
          : f.type === "boolean"
            ? false
            : f.type === "select"
              ? f.options[0]
              : f.key === "source"
                ? "integration fixture"
                : f.required
                  ? f.type === "number"
                    ? 0
                    : f.type === "date"
                      ? "2026-11-01"
                      : f.type === "datetime"
                        ? "2026-11-01T09:00:00+09:00"
                        : "test"
                  : null,
    ]),
  );
async function save(kind, overrides, id = randomUUID(), expectedVersion = 0) {
  const payload = values(kind, overrides);
  const response = await call("/api/records", "POST", {
    id,
    kind,
    payload,
    expectedVersion,
  });
  assert.ok([200, 201].includes(response.status), JSON.stringify(response));
  return response.body.record;
}
try {
  for (let n = 0; n < 100; n++) {
    try {
      await fetch(base + "/api/workspace");
      break;
    } catch {
      if (n === 99) throw new Error(logs);
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  assert.equal((await call("/api/workspace")).status, 401);
  const login = await call("/api/auth/login", "POST", {
    email: "fixture@example.test",
    password: "fixture-password",
  });
  assert.equal(login.status, 200, JSON.stringify(login.body));
  assert.ok(cookie.includes("auth-token"));
  assert.ok(login.headers.getSetCookie().every((c) => c.includes("HttpOnly")));
  assert.equal((await call("/api/workspace")).body.state, "connected");
  const product = await save("products", { title: "integration product" });
  const scenario = await save("scenarios", {
    title: "scenario",
    productId: product.id,
    minutes: 60,
    priceWon: 50000,
    fixedCostWon: 40000,
    variableCostWon: 10000,
  });
  const pilot = await save("pilots", {
    title: "pilot",
    scenarioId: scenario.id,
    date: "2026-11-01",
    status: "conducted",
    attended: 4,
    applied: 4,
    satisfactionResponses: 4,
    satisfactionTotal: 18,
    successful: 3,
  });
  const participant = await save("participants", {
    title: "P001",
    pilotId: pilot.id,
  });
  await save("payments", {
    title: "payment",
    pilotId: pilot.id,
    participantId: participant.id,
    status: "paid",
    amountWon: 50000,
    paidAt: "2026-11-01",
  });
  await save("allocations", {
    title: "allocation",
    fund: "1r",
    category: "test",
    amountWon: 200000,
    confirmed: true,
  });
  const expense = await save("expenses", {
    title: "expense",
    vendor: "fixture vendor",
    category: "test",
    fund: "1r",
    amountWon: 50000,
    pilotId: pilot.id,
  });
  await save("expenses", {
    title: "correction",
    vendor: "fixture vendor",
    category: "test",
    fund: "1r",
    amountWon: -10000,
    pilotId: pilot.id,
    correctionOfId: expense.id,
    correctionReason: "integration correction",
  });
  const task = await save("tasks", { title: "task" });
  await save(
    "tasks",
    {
      title: "task completed",
      status: "done",
      completedAt: "2026-11-01T09:00:00+09:00",
    },
    task.id,
    1,
  );
  const stale = await call("/api/records", "POST", {
    id: task.id,
    kind: "tasks",
    payload: values("tasks", { title: "stale" }),
    expectedVersion: 1,
  });
  assert.equal(stale.status, 409);
  assert.equal(
    (await fetch(base + "/api/records", { method: "DELETE" })).status,
    405,
  );
  const foreignOrigin = await fetch(base + "/api/records", {
    method: "POST",
    headers: {
      Origin: "https://evil.example",
      Cookie: cookie,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  assert.equal(foreignOrigin.status, 403);
  const workspace = await call("/api/workspace");
  assert.equal(workspace.status, 200);
  assert.ok(workspace.headers.get("cache-control").includes("no-store"));
  const summary = summarize(
    toOperatingData(workspace.body.records),
    fixtureProject,
    new Date("2026-11-02"),
  );
  assert.equal(summary.pilots, 1);
  assert.equal(summary.participants, 4);
  assert.equal(summary.paymentCount, 1);
  assert.equal(summary.revenueWon, 50000);
  assert.equal(summary.spentWon, 40000);
  assert.equal(summary.allocatedWon, 200000);
  assert.equal(summary.completed, 1);
  const backup = await call("/api/backup");
  assert.equal(backup.status, 200);
  assert.equal(backup.body.records.length, workspace.body.records.length);
  assert.ok(backup.body.audit.length > backup.body.records.length);
  // Reusing only the browser cookies in a fresh request proves data is server-backed.
  assert.equal(
    (await call("/api/workspace")).body.records.length,
    workspace.body.records.length,
  );
  assert.equal((await call("/api/auth/logout", "POST")).status, 200);
  assert.equal((await call("/api/workspace")).status, 401);
  console.log(
    "PASS API -> synthetic Auth gateway -> PostgreSQL: login/cookies, CRUD, pilot/payment, allocation/expense correction, statistics, version conflict, CSRF, no DELETE, backup, reload, logout",
  );
  if (process.argv.includes("--serve")) {
    console.log("TEST FIXTURE ONLY: http://127.0.0.1:3110/login");
    await new Promise((resolve) => {
      process.once("SIGTERM", resolve);
      process.once("SIGINT", resolve);
    });
  }
} catch (error) {
  console.error(logs);
  throw error;
} finally {
  server.kill("SIGTERM");
  await fixture.close();
}
