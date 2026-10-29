import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import {
  localStore,
  localJson,
  localFailure,
  rejectLocalRequest,
} from "@/lib/local/server";
import { createLocalArchive } from "@/lib/local/archive";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const denied = rejectLocalRequest(request);
  if (denied) return denied;
  try {
    const store = localStore();
    if (new URL(request.url).searchParams.get("files") === "1") {
      const archive = await createLocalArchive(store);
      const stream = createReadStream(archive.filename);
      stream.once("close", () => {
        void archive.cleanup();
      });
      return new Response(Readable.toWeb(stream) as ReadableStream, {
        headers: {
          "Content-Type": "application/gzip",
          "Content-Disposition":
            'attachment; filename="SOMSSI.somssi-backup.gz"',
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    return localJson(store.snapshot(), 200, {
      "Content-Disposition": 'attachment; filename="SOMSSI-local-records.json"',
    });
  } catch (error) {
    return localFailure(error);
  }
}
