import { localJson, rejectLocalRequest } from "@/lib/local/server";
export async function POST(request: Request) {
  return (
    rejectLocalRequest(request) ??
    localJson(
      {
        error: "로컬 모드에는 로그인 세션이 없습니다. 앱을 종료해 주세요.",
        mode: "local",
      },
      410,
    )
  );
}
