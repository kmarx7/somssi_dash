import { serverSession, offlineResponse } from "@/lib/supabase/server";
import { checkMutation } from "@/lib/operations/http";
export async function POST(request: Request) {
  const session = await serverSession();
  if (!session) return offlineResponse();
  const csrf = checkMutation(request);
  if (csrf) return session.respond({ error: csrf }, 403);
  const { error } = await session.client.auth.signOut({ scope: "local" });
  return error
    ? session.respond({ error: "로그아웃 처리에 실패했습니다." }, 503)
    : session.respond({ ok: true });
}
