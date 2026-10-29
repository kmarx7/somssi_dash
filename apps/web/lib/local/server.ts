import "server-only";
import { NextResponse } from "next/server";
import { LocalStore, LocalStoreError, localDataDirectory } from "./store.ts";
import { localRequestError } from "./access.ts";
const state = globalThis as typeof globalThis & {
  somssiLocalStores?: Map<string, LocalStore>;
};
export function localStore() {
  const dir = localDataDirectory();
  state.somssiLocalStores ??= new Map();
  let store = state.somssiLocalStores.get(dir);
  if (!store) {
    store = new LocalStore(dir);
    state.somssiLocalStores.set(dir, store);
  }
  return store;
}
export function localJson(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
}
export function localFailure(error: unknown) {
  if (error instanceof LocalStoreError)
    return localJson({ state: "error", error: error.message }, error.status);
  return localJson(
    {
      state: "error",
      error:
        "로컬 저장소를 처리하지 못했습니다. 저장 폴더 권한과 디스크 공간을 확인해 주세요. 기존 데이터는 초기화하지 않습니다.",
    },
    503,
  );
}
export function rejectLocalRequest(request: Request) {
  const error = localRequestError(request);
  return error ? localJson({ error }, 403) : null;
}
