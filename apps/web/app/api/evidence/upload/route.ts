import { createHash, randomUUID } from "node:crypto";
import { authorize } from "@/lib/supabase/server";
import { checkMutation, boundedFormData, dbError } from "@/lib/operations/http";
import { validatePayload } from "@/lib/operations/validation";
export async function POST(request: Request) {
  const auth = await authorize();
  if ("response" in auth) return auth.response;
  const csrf = checkMutation(request);
  if (csrf) return auth.respond({ error: csrf }, 403);
  if (auth.role === "viewer")
    return auth.respond(
      { error: "조회 전용 계정은 증빙을 업로드할 수 없습니다." },
      403,
    );
  try {
    const form = await boundedFormData(request);
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0 || file.size > 10485760)
      throw new Error("0바이트를 초과하고 10MB 이하인 파일을 선택해 주세요.");
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (
      !ext ||
      !["pdf", "png", "jpg", "jpeg", "webp", "docx", "xlsx"].includes(ext)
    )
      throw new Error("PDF·이미지(PNG/JPG/WebP)·DOCX·XLSX 파일만 지원합니다.");
    const id = randomUUID();
    const path = `${auth.projectId}/${auth.userId}/${id}.${ext}`;
    const bytes = await file.arrayBuffer();
    const hash = createHash("sha256")
      .update(new Uint8Array(bytes))
      .digest("hex");
    const payload = validatePayload("evidence", {
      title: String(form.get("title") ?? ""),
      evidenceType: String(form.get("evidenceType") ?? ""),
      storagePath: path,
      originalName: file.name.replace(/[\x00-\x1f/\\]/g, "_").slice(0, 200),
      sha256: hash,
      size: file.size,
      contentType: "application/octet-stream",
      source: "사용자 직접 업로드",
      checkedAt: new Date().toISOString().slice(0, 10),
      verificationStatus: "확인 필요",
      evidenceIds: [],
    });
    const upload = await auth.client.storage
      .from("somssi-evidence")
      .upload(path, bytes, {
        contentType: "application/octet-stream",
        upsert: false,
      });
    if (upload.error)
      return auth.respond(
        {
          error:
            "비공개 파일 저장에 실패했습니다. 버킷·권한·연결 상태를 확인해 주세요.",
        },
        503,
      );
    const record = await auth.client.rpc("somssi_write_record", {
      p_project_id: auth.projectId,
      p_id: id,
      p_kind: "evidence",
      p_payload: payload,
      p_expected_version: 0,
    });
    if (record.error) {
      const failure = dbError(record.error.code);
      return auth.respond(
        {
          error: `파일은 비공개 업로드되었지만 증빙 등록이 완료되지 않았습니다. 관리자에게 파일 ID ${id}로 확인을 요청해 주세요. ${failure.error}`,
        },
        failure.status,
      );
    }
    return auth.respond({ record: record.data }, 201);
  } catch (error) {
    return auth.respond(
      {
        error:
          error instanceof Error && !("issues" in error)
            ? error.message
            : "파일과 필수 항목을 확인해 주세요.",
      },
      422,
    );
  }
}
