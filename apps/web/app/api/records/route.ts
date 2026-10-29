import { authorize } from "@/lib/supabase/server";
import { checkMutation, jsonBody, dbError } from "@/lib/operations/http";
import { validatePayload, writeSchema } from "@/lib/operations/validation";
import { domains } from "@/lib/operations/domains";
export async function POST(request: Request) {
  const auth = await authorize();
  if ("response" in auth) return auth.response;
  const csrf = checkMutation(request);
  if (csrf) return auth.respond({ error: csrf }, 403);
  if (auth.role === "viewer")
    return auth.respond({ error: "조회 전용 계정입니다." }, 403);
  let input;
  let payload;
  try {
    input = writeSchema.parse(await jsonBody(request));
    payload = validatePayload(input.kind, input.payload);
    if (domains[input.kind].uploadOnly)
      throw new Error("증빙은 업로드 화면에서 등록해 주세요.");
  } catch (error) {
    return auth.respond(
      {
        error:
          error instanceof Error && !("issues" in error)
            ? error.message
            : "필수 항목·날짜·숫자·연결 항목을 확인해 주세요.",
      },
      422,
    );
  }
  const { data, error } = await auth.client.rpc("somssi_write_record", {
    p_project_id: auth.projectId,
    p_id: input.id,
    p_kind: input.kind,
    p_payload: payload,
    p_expected_version: input.expectedVersion,
  });
  if (error) {
    const failure = dbError(error.code);
    return auth.respond({ error: failure.error }, failure.status);
  }
  return auth.respond(
    { record: data },
    input.expectedVersion === 0 ? 201 : 200,
  );
}
