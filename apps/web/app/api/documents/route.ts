import {
  localStore,
  localJson,
  localFailure,
  rejectLocalRequest,
} from "@/lib/local/server";
import { documentStatus, generationFiles } from "@/lib/documents/service";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const denied = rejectLocalRequest(request);
  if (denied) return denied;
  try {
    const store = localStore();
    return localJson({
      ...(await documentStatus(store)),
      jobs: await generationFiles(store),
    });
  } catch (error) {
    return localFailure(error);
  }
}
