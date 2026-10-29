import { localJson, rejectLocalRequest } from "@/lib/local/server";
export async function POST(request: Request) {
  return (
    rejectLocalRequest(request) ??
    localJson(
      {
        error:
          "로컬 모드는 계정 로그인을 사용하지 않습니다. 대시보드에서 바로 이용할 수 있습니다.",
        mode: "local",
      },
      410,
    )
  );
}
