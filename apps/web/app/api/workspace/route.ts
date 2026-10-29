import { authorize } from "@/lib/supabase/server";
export async function GET() {
  const auth = await authorize();
  if ("response" in auth) return auth.response;
  const [project, records] = await Promise.all([
    auth.client
      .from("somssi_projects")
      .select("id,name,deadline,budget_won")
      .eq("id", auth.projectId)
      .single(),
    auth.client
      .from("somssi_records")
      .select("*")
      .eq("project_id", auth.projectId)
      .order("created_at")
      .order("id")
      .range(0, 999),
  ]);
  // Refuse partial aggregates. Cursor paging is required before enabling larger projects.
  const count = await auth.client
    .from("somssi_records")
    .select("id", { count: "exact", head: true })
    .eq("project_id", auth.projectId);
  if (
    project.error ||
    records.error ||
    count.error ||
    count.count === null ||
    count.count !== records.data?.length
  )
    return auth.respond(
      {
        state: "error",
        error:
          "전체 운영 데이터를 읽지 못했습니다. 부분 합계를 표시하지 않습니다.",
      },
      503,
    );
  return auth.respond({
    state: "connected",
    project: project.data,
    role: auth.role,
    userId: auth.userId,
    records: records.data,
  });
}
