import { z } from "zod";
import { serverSession, offlineResponse } from "@/lib/supabase/server";
import { checkMutation, jsonBody } from "@/lib/operations/http";
export async function POST(request: Request) {
  const session = await serverSession();
  if (!session) return offlineResponse();
  const csrf = checkMutation(request);
  if (csrf) return session.respond({ error: csrf }, 403);
  let input;
  try {
    input = z
      .strictObject({
        email: z.email().max(254),
        password: z.string().min(1).max(256),
      })
      .parse(await jsonBody(request));
  } catch {
    return session.respond(
      { error: "이메일과 비밀번호를 확인해 주세요." },
      422,
    );
  }
  const { error } = await session.client.auth.signInWithPassword(input);
  if (error)
    return session.respond(
      { error: "로그인할 수 없습니다. 계정 정보와 연결 상태를 확인해 주세요." },
      401,
    );
  return session.respond({ ok: true });
}
