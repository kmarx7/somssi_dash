import { z } from "zod";
import { authorize } from "@/lib/supabase/server";
export async function GET(request: Request) {
  const auth = await authorize();
  if ("response" in auth) return auth.response;
  const id = new URL(request.url).searchParams.get("id");
  if (!z.uuid().safeParse(id).success)
    return auth.respond({ error: "유효한 증빙 ID가 필요합니다." }, 422);
  const record = await auth.client
    .from("somssi_records")
    .select("payload,created_by")
    .eq("id", id!)
    .eq("project_id", auth.projectId)
    .eq("kind", "evidence")
    .maybeSingle();
  if (record.error)
    return auth.respond({ error: "증빙을 조회할 수 없습니다." }, 503);
  if (
    !record.data ||
    auth.role === "viewer" ||
    (auth.role === "editor" && record.data.created_by !== auth.userId)
  )
    return auth.respond({ error: "증빙 파일 접근 권한이 없습니다." }, 403);
  const payload = record.data.payload;
  const path = String(payload.storagePath);
  if (!path.startsWith(`${auth.projectId}/`))
    return auth.respond({ error: "증빙 경로가 일치하지 않습니다." }, 403);
  const signed = await auth.client.storage
    .from("somssi-evidence")
    .createSignedUrl(path, 60, { download: String(payload.originalName) });
  if (signed.error)
    return auth.respond({ error: "파일 다운로드를 준비하지 못했습니다." }, 503);
  return auth.respond({ url: signed.data.signedUrl, expiresIn: 60 });
}
