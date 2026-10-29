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
  try {
    const store = localStore();
    return localJson({
      state: "connected",
      mode: "local",
      project: store.project,
      role: "owner",
      userId: store.userId,
      records: store.list(),
      storage: {
        directory: store.directory,
        database: "store.sqlite",
        account: "이 컴퓨터의 로컬 사용자",
      },
    });
  } catch (error) {
    return localFailure(error);
  }
}
