import { request as httpRequest } from "node:http";
// Real Next.js -> real on-disk SQLite/files, no cloud or synthetic auth server.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { once } from "node:events";
import { localValues } from "./support/local-records.mjs";
import { toOperatingData } from "../apps/web/lib/operations/projection.ts";
import { summarize } from "../apps/web/lib/v2/metrics.ts";
import { restoreLocalArchive } from "../apps/web/lib/local/archive.ts";
import { LocalStore } from "../apps/web/lib/local/store.ts";
const root = await mkdtemp(path.join(tmpdir(), "somssi-local-api-"));
const dataDir = path.join(root, "live");
const port = Number(process.env.LOCAL_TEST_PORT ?? 3110),
  base = `http://127.0.0.1:${port}`;
let server;
let logs = "";
async function start() {
  const env = { ...process.env, SOMSSI_DATA_DIR: dataDir };
  delete env.SUPABASE_URL;
  delete env.SUPABASE_PUBLISHABLE_KEY;
  delete env.SOMSSI_PROJECT_ID;
  server = spawn(
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
    { env, stdio: ["ignore", "pipe", "pipe"] },
  );
  server.stdout.on("data", (d) => (logs += d));
  server.stderr.on("data", (d) => (logs += d));
  for (let n = 0; n < 100; n++) {
    try {
      const r = await fetch(base + "/api/workspace", {
        signal: AbortSignal.timeout(1000),
      });
      if (r.ok) return;
    } catch {}
    if (server.exitCode !== null) throw new Error(logs);
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("Local test server timeout: " + logs);
}
async function stop() {
  if (server && server.exitCode === null) {
    const exit = once(server, "exit");
    server.kill("SIGTERM");
    await exit;
  }
}
async function call(url, method = "GET", body) {
  const r = await fetch(base + url, {
    method,
    headers: {
      Origin: base,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, headers: r.headers, body: await r.json() };
}
async function save(kind, values = {}, id = randomUUID(), expectedVersion = 0) {
  const r = await call("/api/records", "POST", {
    id,
    kind,
    payload: localValues(kind, values),
    expectedVersion,
  });
  assert.ok([200, 201].includes(r.status), JSON.stringify(r));
  return r.body.record;
}
try {
  const fixtureSetup = new LocalStore(dataDir);
  fixtureSetup.db.prepare("update projects set name=?").run("LOCAL TEST ONLY");
  fixtureSetup.close();
  await start();
  const initial = await call("/api/workspace");
  assert.equal(initial.body.mode, "local");
  assert.equal(initial.body.state, "connected");
  assert.equal(initial.body.records.length, 0);
  assert.equal(initial.body.storage.directory, dataDir);
  const projectId = initial.body.project.id;
  assert.equal((await call("/api/auth/login", "POST", {})).status, 410);
  const product = await save("products", { title: "local product" }),
    scenario = await save("scenarios", {
      productId: product.id,
      minutes: 60,
      priceWon: 50000,
      fixedCostWon: 40000,
      variableCostWon: 10000,
    });
  const pilot = await save("pilots", {
    scenarioId: scenario.id,
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
    pilotId: pilot.id,
    participantId: participant.id,
    status: "paid",
    amountWon: 50000,
    paidAt: "2026-11-01",
  });
  await save("allocations", {
    fund: "1r",
    category: "category",
    amountWon: 200000,
    confirmed: true,
  });
  const expense = await save("expenses", {
    vendor: "vendor",
    category: "category",
    amountWon: 50000,
    pilotId: pilot.id,
  });
  await save("expenses", {
    vendor: "vendor",
    category: "category",
    amountWon: -10000,
    pilotId: pilot.id,
    correctionOfId: expense.id,
    correctionReason: "local correction",
  });
  const task = await save("tasks", { title: "local saved task" });
  await save(
    "tasks",
    {
      title: "local completed task",
      status: "done",
      completedAt: "2026-11-01T14:00:00+09:00",
    },
    task.id,
    1,
  );
  assert.equal(
    (
      await call("/api/records", "POST", {
        id: task.id,
        kind: "tasks",
        payload: localValues("tasks"),
        expectedVersion: 1,
      })
    ).status,
    409,
  );
  assert.equal(
    (await fetch(base + "/api/records", { method: "DELETE" })).status,
    405,
  );
  assert.equal(
    (
      await fetch(base + "/api/workspace", {
        headers: { Origin: "https://evil.example" },
      })
    ).status,
    403,
  );
  const hostileHostStatus = await new Promise((resolve, reject) => {
    const req = httpRequest(
      base + "/api/workspace",
      { headers: { Host: "evil.example" } },
      (res) => {
        res.resume();
        resolve(res.statusCode);
      },
    );
    req.on("error", reject);
    req.end();
  });
  assert.equal(hostileHostStatus, 403);
  assert.equal(
    (
      await fetch(base + "/api/records", {
        method: "POST",
        headers: {
          Origin: "https://evil.example",
          "Content-Type": "application/json",
        },
        body: "{}",
      })
    ).status,
    403,
  );
  const pdf = Buffer.from("%PDF-1.4\nLOCAL TEST EVIDENCE\n");
  const form = new FormData();
  form.set("title", "local receipt");
  form.set("evidenceType", "영수증");
  form.set("file", new File([pdf], "local.pdf", { type: "application/pdf" }));
  const uploaded = await fetch(base + "/api/evidence/upload", {
    method: "POST",
    headers: { Origin: base },
    body: form,
  });
  assert.equal(uploaded.status, 201);
  const evidence = (await uploaded.json()).record;
  const download = await fetch(
    base + `/api/evidence/download?id=${evidence.id}`,
  );
  assert.equal(download.status, 200);
  assert.ok(download.headers.get("content-disposition").includes("attachment"));
  assert.deepEqual(Buffer.from(await download.arrayBuffer()), pdf);
  const workspace = await call("/api/workspace");
  const stats = summarize(
    toOperatingData(workspace.body.records),
    projectId,
    new Date(),
  );
  assert.equal(stats.pilots, 1);
  assert.equal(stats.participants, 4);
  assert.equal(stats.revenueWon, 50000);
  assert.equal(stats.spentWon, 40000);
  assert.equal(stats.allocatedWon, 200000);
  assert.equal(stats.completed, 1);
  const recordsBackup = await call("/api/backup");
  assert.equal(recordsBackup.status, 200);
  assert.equal(
    recordsBackup.body.records.length,
    workspace.body.records.length,
  );
  assert.ok(
    recordsBackup.body.audit.length > recordsBackup.body.records.length,
  );
  const full = await fetch(base + "/api/backup?files=1");
  assert.equal(full.status, 200);
  const archive = path.join(root, "backup.somssi-backup.gz");
  await writeFile(archive, new Uint8Array(await full.arrayBuffer()));
  const restoredDir = await restoreLocalArchive(
    archive,
    path.join(root, "restored"),
  );
  const restored = new LocalStore(restoredDir);
  try {
    assert.equal(restored.list().length, workspace.body.records.length);
    assert.deepEqual(
      await readFile(restored.evidencePath(restored.get(evidence.id))),
      pdf,
    );
  } finally {
    restored.close();
  }
  await stop();
  await start();
  const reopened = await call("/api/workspace");
  assert.equal(reopened.body.project.id, projectId);
  assert.equal(reopened.body.records.length, workspace.body.records.length);
  assert.ok(
    reopened.body.records.some((r) => r.id === task.id && r.version === 2),
  );
  const again = await fetch(base + `/api/evidence/download?id=${evidence.id}`);
  assert.equal(
    createHash("sha256")
      .update(Buffer.from(await again.arrayBuffer()))
      .digest("hex"),
    evidence.payload.sha256,
  );
  console.log(
    "PASS local API: no credentials, SQLite CRUD/audit, pilot/payment stats, expense correction, version conflict, host/origin protection, private evidence byte/hash, JSON/full backup restore, app restart persistence",
  );
  if (process.argv.includes("--serve")) {
    console.log("LOCAL TEST DATA ONLY: " + base + "/dashboard");
    await new Promise((resolve) => {
      process.once("SIGINT", resolve);
      process.once("SIGTERM", resolve);
    });
  }
} catch (error) {
  console.error(logs);
  throw error;
} finally {
  await stop();
  await rm(root, { recursive: true, force: true });
}
