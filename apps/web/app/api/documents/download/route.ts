import {
  localStore,
  localFailure,
  rejectLocalRequest,
} from "@/lib/local/server";
import { downloadDocument } from "@/lib/documents/service";
import { documentAttachment } from "@/lib/documents/filenames";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const denied = rejectLocalRequest(request);
  if (denied) return denied;
  try {
    const url = new URL(request.url);
    const { content, item } = await downloadDocument(
      localStore(),
      url.searchParams.get("job") ?? "",
      url.searchParams.get("file") ?? "",
    );
    return new Response(new Uint8Array(content), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": documentAttachment(item),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return localFailure(error);
  }
}
