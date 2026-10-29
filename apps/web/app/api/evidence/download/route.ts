import { open } from "node:fs/promises";
import { constants } from "node:fs";
import { createHash } from "node:crypto";
import { z } from "zod";
import {
  localStore,
  localJson,
  localFailure,
  rejectLocalRequest,
} from "@/lib/local/server";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const denied = rejectLocalRequest(request);
  if (denied) return denied;
  const id = new URL(request.url).searchParams.get("id");
  if (!z.uuid().safeParse(id).success)
    return localJson({ error: "유효한 증빙 ID가 필요합니다." }, 422);
  try {
    const store = localStore();
    const record = store.get(id!);
    if (!record || record.kind !== "evidence")
      return localJson({ error: "증빙 파일이 없습니다." }, 404);
    const handle = await open(
      store.evidencePath(record),
      constants.O_RDONLY | constants.O_NOFOLLOW,
    );
    let bytes: Buffer;
    try {
      const stat = await handle.stat();
      if (
        !stat.isFile() ||
        stat.size !== record.payload.size ||
        stat.size > 10485760
      )
        return localJson({ error: "증빙 파일 크기가 일치하지 않습니다." }, 409);
      bytes = await handle.readFile();
    } finally {
      await handle.close();
    }
    if (
      createHash("sha256").update(bytes).digest("hex") !== record.payload.sha256
    )
      return localJson(
        {
          error:
            "증빙 파일의 원본 해시가 일치하지 않습니다. 파일을 확인해 주세요.",
        },
        409,
      );
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="evidence-${record.id}"; filename*=UTF-8''${encodeURIComponent(String(record.payload.originalName))}`,
        "Content-Length": String(bytes.length),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return localFailure(error);
  }
}
