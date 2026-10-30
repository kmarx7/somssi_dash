import { z } from "zod";
import {
  localStore,
  localJson,
  localFailure,
  rejectLocalRequest,
} from "@/lib/local/server";
import { generateDocuments } from "@/lib/documents/service";
import { jsonBody } from "@/lib/operations/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const denied = rejectLocalRequest(request);
  if (denied) return denied;
  let ids: string[];
  try {
    ids = z
      .strictObject({ draftIds: z.array(z.uuid()).min(1).max(12) })
      .parse(await jsonBody(request)).draftIds;
  } catch {
    return localJson({ error: "문서 입력 초안을 선택해 주세요" }, 422);
  }
  try {
    return localJson(await generateDocuments(localStore(), ids), 201);
  } catch (error) {
    return localFailure(error);
  }
}
