import { readFile, writeFile, mkdir, lstat, realpath } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash, randomUUID } from "node:crypto";
import { LocalStore, LocalStoreError } from "../local/store.ts";
import type { StoredRecord } from "../operations/domains.ts";
const execute = promisify(execFile);
const hash = (b: Uint8Array | string) =>
  createHash("sha256").update(b).digest("hex");
const uuid = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
const templateFiles = [
  "meeting_minutes.docx",
  "activity_evidence.docx",
  "purchase_justification.docx",
  "fund_usage_details.xlsx",
];
export type GeneratedFile = {
  filename: string;
  title: string;
  sha256: string;
  size: number;
  pages: number | null;
  warnings: string[];
};
export type GenerationManifest = {
  status: string;
  files: GeneratedFile[];
  warnings: string[];
  structurePreserved: boolean;
  rendered: boolean;
  layoutTextChecked?: boolean;
};
type Runtime = {
  python: string;
  node: string;
  renderer: string;
  runtimeBin: string;
  artifactModules: string;
  fontConfig?: string;
};
async function regularFile(file: string) {
  const stat = await lstat(file);
  if (stat.isSymbolicLink() || !stat.isFile())
    throw new Error("일반 로컬 파일이 필요합니다");
}
async function configuration(store: LocalStore) {
  const dir = path.join(store.directory, "documents");
  const config = JSON.parse(
    await readFile(path.join(dir, "runtime.json"), "utf8"),
  ) as Runtime;
  for (const key of [
    "python",
    "node",
    "renderer",
    "runtimeBin",
    "artifactModules",
  ] as const)
    if (typeof config[key] !== "string" || !path.isAbsolute(config[key]))
      throw new Error("로컬 문서 런타임 경로를 확인해 주세요");
  for (const key of [
    "python",
    "node",
    "renderer",
    "runtimeBin",
    "artifactModules",
  ] as const)
    await lstat(config[key]);
  if (config.fontConfig) {
    if (!path.isAbsolute(config.fontConfig))
      throw new Error("폰트 설정 경로 오류");
    await regularFile(config.fontConfig);
  }
  const manifest = JSON.parse(
    await readFile(path.join(dir, "templates/manifest.json"), "utf8"),
  ) as Record<string, { sha256: string }>;
  for (const name of templateFiles) {
    const file = path.join(dir, "templates", name);
    await regularFile(file);
    if (hash(await readFile(file)) !== manifest[name]?.sha256)
      throw new Error("등록된 원본 양식 해시가 다릅니다");
  }
  return { dir, config };
}
export async function documentStatus(store: LocalStore) {
  try {
    await configuration(store);
    return { ready: true, templates: templateFiles };
  } catch {
    return {
      ready: false,
      templates: [],
      error:
        "비공개 원본 양식 또는 로컬 문서 런타임이 준비되지 않았습니다. docs/DOCUMENT_AUTOMATION.md를 확인해 주세요.",
    };
  }
}
function projectRoot() {
  let dir = process.cwd();
  for (let i = 0; i < 7; i++) {
    if (path.basename(dir) === "apps") return path.dirname(dir);
    if (dir === path.dirname(dir)) break;
    dir = path.dirname(dir);
  }
  return process.cwd();
}
export function validateDraftSelection(
  records: readonly StoredRecord[],
  ids: readonly string[],
) {
  if (
    ids.length < 1 ||
    ids.length > 12 ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !uuid.test(id))
  )
    throw new LocalStoreError(
      422,
      "서로 다른 입력 초안 1~12개를 선택해 주세요",
    );
  const selected = ids.map((id) =>
    records.find((r) => r.id === id && r.kind === "documentDrafts"),
  );
  if (selected.some((r) => !r))
    throw new LocalStoreError(422, "선택한 문서 입력 초안을 찾지 못했습니다");
  for (const r of selected) {
    if (r!.payload.state === "보관")
      throw new LocalStoreError(422, "보관된 입력 초안은 선택할 수 없습니다");
    const expenses = (r!.payload.expenseIds as string[]).map((id) =>
      records.find((e) => e.id === id && e.kind === "expenses"),
    );
    if (expenses.some((e) => !e || e.payload.fund !== "1r"))
      throw new LocalStoreError(
        422,
        "다른 자금의 지출을 이 1R 양식에 혼합할 수 없습니다",
      );
    if (
      r!.payload.template === "activity" &&
      (!expenses.length ||
        expenses.some((e) => e!.payload.category === "회의비"))
    )
      throw new LocalStoreError(
        422,
        "활동비 증빙에는 실제 여비 등 별도 지출을 선택하세요. 회의비는 회의록에서 작성합니다",
      );
    const limit = r!.payload.template === "activity" ? 3 : 21;
    if (expenses.length > limit)
      throw new LocalStoreError(
        422,
        `원본 양식의 ${limit}행 용량을 초과했습니다. 분리 작성해 주세요`,
      );
  }
  return selected as StoredRecord[];
}
export async function generateDocuments(store: LocalStore, ids: string[]) {
  const snapshot = store.snapshot();
  validateDraftSelection(snapshot.records, ids);
  let settings;
  try {
    settings = await configuration(store);
  } catch {
    throw new LocalStoreError(
      503,
      "로컬 원본 양식·문서 런타임을 확인해 주세요",
    );
  }
  const { dir, config } = settings;
  const jobId = randomUUID();
  const output = path.join(dir, "jobs", jobId);
  await mkdir(output, { recursive: true, mode: 0o700 });
  const body = JSON.stringify({
    project: snapshot.project,
    records: snapshot.records,
    draftIds: ids,
    templatesDir: path.join(dir, "templates"),
    outputDir: output,
  });
  const snapshotHash = hash(body);
  const input = path.join(output, "snapshot.json");
  await writeFile(input, body, { mode: 0o600 });
  const worker = path.join(projectRoot(), "services/docgen/generate.py");
  try {
    await execute(
      config.python,
      [worker, input, path.join(dir, "runtime.json")],
      { timeout: 300000, maxBuffer: 1024 * 1024 },
    );
  } catch (error) {
    await writeFile(path.join(output, "failure.log"), String(error), {
      mode: 0o600,
    });
    store.write(
      "documentGenerations",
      randomUUID(),
      {
        title: `문서 생성 실패 ${new Date().toISOString()}`,
        jobId,
        draftIds: ids,
        status: "생성 실패",
        snapshotHash,
        manifestHash: hash("failure"),
        checks: "생성·렌더 실패. 비공개 failure.log 확인",
        source: "로컬 문서 생성 시도",
        checkedAt: new Date().toISOString().slice(0, 10),
        verificationStatus: "확인 필요",
        evidenceIds: [],
      },
      0,
    );
    throw new LocalStoreError(
      422,
      "원본 처리·렌더 검사가 실패했습니다. 입력 길이·행 용량·런타임을 확인해 주세요. 로컬 작업 폴더에 실패 기록을 보관했습니다.",
    );
  }
  const manifestBytes = await readFile(path.join(output, "manifest.json"));
  const manifest = JSON.parse(manifestBytes.toString()) as GenerationManifest;
  const record = store.write(
    "documentGenerations",
    randomUUID(),
    {
      title: `양식 생성 ${new Date().toISOString()}`,
      jobId,
      draftIds: ids,
      status: "검토 필요",
      snapshotHash,
      manifestHash: hash(manifestBytes),
      checks: JSON.stringify({
        structure: manifest.structurePreserved,
        rendered: manifest.rendered,
        warnings: manifest.warnings,
      }),
      source: "로컬 원본 양식·버전 고정 데이터 스냅샷",
      checkedAt: new Date().toISOString().slice(0, 10),
      verificationStatus: "확인 필요",
      evidenceIds: [],
    },
    0,
  );
  return { record, manifest };
}
export async function downloadDocument(
  store: LocalStore,
  jobId: string,
  filename: string,
) {
  if (!uuid.test(jobId) || !/^[-\w]+\.(docx|xlsx|pdf|zip)$/.test(filename))
    throw new LocalStoreError(404, "파일을 찾지 못했습니다");
  const job = store
    .list()
    .find((r) => r.kind === "documentGenerations" && r.payload.jobId === jobId);
  if (!job) throw new LocalStoreError(404, "생성 이력을 찾지 못했습니다");
  if (job.payload.status !== "검토 필요")
    throw new LocalStoreError(409, "생성 실패한 문서는 내려받을 수 없습니다");
  const dir = path.join(store.directory, "documents/jobs", jobId);
  const manifestPath = path.join(dir, "manifest.json");
  await regularFile(manifestPath);
  const bytes = await readFile(manifestPath);
  if (hash(bytes) !== job.payload.manifestHash)
    throw new LocalStoreError(409, "생성 목록 해시가 변경되었습니다");
  const manifest = JSON.parse(bytes.toString()) as GenerationManifest;
  if (!manifest.layoutTextChecked)
    throw new LocalStoreError(
      409,
      "레이아웃 보완 전 출력입니다. 입력 초안에서 다시 작성해 주세요",
    );
  const item = manifest.files.find((f) => f.filename === filename);
  if (!item) throw new LocalStoreError(404, "파일을 찾지 못했습니다");
  const file = path.join(dir, filename);
  await regularFile(file);
  if (!(await realpath(file)).startsWith((await realpath(dir)) + path.sep))
    throw new LocalStoreError(403, "잘못된 파일 경로입니다");
  const content = await readFile(file);
  if (content.length !== item.size || hash(content) !== item.sha256)
    throw new LocalStoreError(409, "작성 파일 해시가 변경되었습니다");
  return { content, item };
}
export async function generationFiles(store: LocalStore) {
  const jobs = [];
  for (const r of store
    .list()
    .filter((r) => r.kind === "documentGenerations")
    .reverse()) {
    try {
      const bytes = await readFile(
        path.join(
          store.directory,
          "documents/jobs",
          String(r.payload.jobId),
          "manifest.json",
        ),
      );
      if (hash(bytes) !== r.payload.manifestHash) throw new Error();
      const manifest = JSON.parse(bytes.toString()) as GenerationManifest;
      if (!manifest.layoutTextChecked) {
        jobs.push({
          record: r,
          error:
            "레이아웃 보완 전 시험 출력입니다. 입력 초안에서 다시 작성해 주세요.",
        });
        continue;
      }
      jobs.push({ record: r, manifest });
    } catch {
      jobs.push({ record: r, error: "결과 파일 누락·변경 확인 필요" });
    }
  }
  return jobs;
}
