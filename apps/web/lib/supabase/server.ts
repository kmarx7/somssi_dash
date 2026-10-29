import "server-only";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

export function serverConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  const projectId = process.env.SOMSSI_PROJECT_ID;
  if (!url || !key || !projectId || !z.uuid().safeParse(projectId).success)
    return null;
  const parsed = URL.parse(url);
  if (
    !parsed ||
    !(
      parsed.protocol === "https:" ||
      (parsed.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(parsed.hostname))
    )
  )
    return null;
  return { url, key, projectId };
}

export async function serverSession() {
  const config = serverConfig();
  if (!config) return null;
  const jar = await cookies();
  const pending: { name: string; value: string; options: CookieOptions }[] = [];
  const cacheHeaders: Record<string, string> = {};
  const client = createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (items, headers) => {
        pending.push(...items);
        Object.assign(cacheHeaders, headers);
      },
    },
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure:
        process.env.NODE_ENV === "production" &&
        config.url.startsWith("https:"),
    },
  });
  const respond = (
    body: unknown,
    status = 200,
    extra: Record<string, string> = {},
  ) => {
    const res = NextResponse.json(body, {
      status,
      headers: {
        ...cacheHeaders,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        ...extra,
      },
    });
    pending.forEach((c) => res.cookies.set(c.name, c.value, c.options));
    return res;
  };
  return { client, projectId: config.projectId, respond };
}
export const offlineResponse = () =>
  NextResponse.json(
    { state: "unconfigured", error: "저장소 연결 설정이 필요합니다." },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
export async function authorize() {
  const session = await serverSession();
  if (!session) return { response: offlineResponse() } as const;
  const { data, error } = await session.client.auth.getUser();
  if (error || !data.user)
    return {
      response: session.respond(
        { state: "signed_out", error: "로그인이 필요합니다." },
        401,
      ),
    } as const;
  const membership = await session.client
    .from("somssi_project_members")
    .select("role")
    .eq("project_id", session.projectId)
    .eq("user_id", data.user.id)
    .eq("active", true)
    .maybeSingle();
  if (membership.error)
    return {
      response: session.respond(
        {
          state: "error",
          error: "권한 조회에 실패했습니다. 저장소 설치 상태를 확인해 주세요.",
        },
        503,
      ),
    } as const;
  if (!membership.data)
    return {
      response: session.respond(
        { state: "forbidden", error: "이 프로젝트의 접근 권한이 없습니다." },
        403,
      ),
    } as const;
  return {
    ...session,
    userId: data.user.id,
    role: membership.data.role as "owner" | "admin" | "editor" | "viewer",
  } as const;
}
