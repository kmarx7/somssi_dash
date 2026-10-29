import { checkMutation } from "../operations/http.ts";
export function localRequestError(request: Request): string | null {
  const host = request.headers.get("host");
  if (!host) return "로컬 주소 정보가 필요합니다.";
  const parsed = URL.parse(`http://${host}`);
  if (!parsed || !["127.0.0.1", "localhost", "[::1]"].includes(parsed.hostname))
    return "이 컴퓨터의 로컬 주소에서만 접근할 수 있습니다.";
  const site = request.headers.get("sec-fetch-site");
  if (site && !["same-origin", "none"].includes(site))
    return "다른 사이트에서는 로컬 데이터에 접근할 수 없습니다.";
  const origin = request.headers.get("origin");
  if (origin && origin !== `http://${host}`)
    return "다른 출처에서는 로컬 데이터에 접근할 수 없습니다.";
  if (!["GET", "HEAD"].includes(request.method)) return checkMutation(request);
  return null;
}
