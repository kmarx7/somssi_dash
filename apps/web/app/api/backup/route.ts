import { authorize } from "@/lib/supabase/server";
export async function GET() {
  const auth = await authorize();
  if ("response" in auth) return auth.response;
  if (!["owner", "admin"].includes(auth.role))
    return auth.respond(
      { error: "백업은 관리자만 내려받을 수 있습니다." },
      403,
    );
  const { data, error } = await auth.client.rpc("somssi_export_backup", {
    p_project_id: auth.projectId,
  });
  if (error) return auth.respond({ error: "백업 생성에 실패했습니다." }, 503);
  return auth.respond(data, 200, {
    "Content-Disposition": 'attachment; filename="SOMSSI-private-backup.json"',
  });
}
