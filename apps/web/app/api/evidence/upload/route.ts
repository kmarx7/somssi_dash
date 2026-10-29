import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, unlink } from "node:fs/promises";
import path from "node:path";
import {
  localStore,
  localJson,
  localFailure,
  rejectLocalRequest,
} from "@/lib/local/server";
import { boundedFormData } from "@/lib/operations/http";
import { validatePayload } from "@/lib/operations/validation";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const denied = rejectLocalRequest(request);
  if (denied) return denied;
  let form: FormData;
  try {
    form = await boundedFormData(request);
  } catch {
    return localJson(
      {
        error:
          "유효한 파일을 선택해 주세요. 최대 10MB까지 업로드할 수 있습니다.",
      },
      422,
    );
  }
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > 10485760)
    return localJson(
      { error: "0바이트 초과·10MB 이하 파일을 선택해 주세요." },
      422,
    );
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (
    !ext ||
    !["pdf", "png", "jpg", "jpeg", "webp", "docx", "xlsx"].includes(ext)
  )
    return localJson(
      { error: "PDF·PNG/JPG/WebP·DOCX·XLSX 파일만 지원합니다." },
      422,
    );
  let filename: string | undefined;
  let created = false;
  try {
    const store = localStore();
    const id = randomUUID();
    const bytes = new Uint8Array(await file.arrayBuffer());
    const payload = validatePayload("evidence", {
      title: String(form.get("title") ?? ""),
      evidenceType: String(form.get("evidenceType") ?? ""),
      storagePath: `${store.project.id}/${store.userId}/${id}.${ext}`,
      originalName: file.name.replace(/[\x00-\x1f/\\]/g, "_").slice(0, 200),
      sha256: createHash("sha256").update(bytes).digest("hex"),
      size: file.size,
      contentType: "application/octet-stream",
      source: "사용자 로컬 업로드",
      checkedAt: new Date().toISOString().slice(0, 10),
      verificationStatus: "확인 필요",
      evidenceIds: [],
    });
    filename = store.evidencePath({
      id,
      project_id: store.project.id,
      kind: "evidence",
      payload,
      version: 1,
      created_by: store.userId,
      created_at: "",
      updated_at: "",
    });
    await mkdir(path.dirname(filename), { recursive: true, mode: 0o700 });
    const handle = await open(filename, "wx", 0o600);
    created = true;
    try {
      await handle.writeFile(bytes);
      await handle.sync();
    } finally {
      await handle.close();
    }
    const record = store.write("evidence", id, payload, 0);
    filename = undefined;
    return localJson({ record }, 201);
  } catch (error) {
    if (filename && created) await unlink(filename).catch(() => {}); // Only the uncommitted, newly created upload; never an expense or existing evidence.
    if (error instanceof Error && "issues" in error)
      return localJson({ error: "증빙 제목·유형을 확인해 주세요." }, 422);
    return localFailure(error);
  }
}
