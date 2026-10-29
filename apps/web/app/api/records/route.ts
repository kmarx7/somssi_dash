import {
  localStore,
  localJson,
  localFailure,
  rejectLocalRequest,
} from "@/lib/local/server";
import { jsonBody } from "@/lib/operations/http";
import { writeSchema, validatePayload } from "@/lib/operations/validation";
import { domains } from "@/lib/operations/domains";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const denied = rejectLocalRequest(request);
  if (denied) return denied;
  let input;
  let payload;
  try {
    input = writeSchema.parse(await jsonBody(request));
    payload = validatePayload(input.kind, input.payload);
    if (domains[input.kind].uploadOnly)
      throw new Error("증빙은 업로드 화면에서 등록해 주세요.");
  } catch (error) {
    return localJson(
      {
        error:
          error instanceof Error && !("issues" in error)
            ? error.message
            : "필수 항목·날짜·숫자·연결 항목을 확인해 주세요.",
      },
      422,
    );
  }
  try {
    return localJson(
      {
        record: localStore().write(
          input.kind,
          input.id,
          payload,
          input.expectedVersion,
        ),
      },
      input.expectedVersion === 0 ? 201 : 200,
    );
  } catch (error) {
    return localFailure(error);
  }
}
