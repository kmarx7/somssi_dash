export function checkMutation(request: Request): string | null {
  const origin = request.headers.get("origin");
  // Next may normalize the internal URL hostname to localhost. Browser Origin
  // must match the actual Host header (including its port), not that internal URL.
  const ownUrl = new URL(request.url);
  const host = request.headers.get("host");
  if (host) ownUrl.host = host;
  const own = ownUrl.origin;
  if (
    !origin ||
    origin !== own ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    return "동일한 사이트에서만 요청할 수 있습니다.";
  return null;
}
export async function jsonBody(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new Error("JSON 요청이 필요합니다.");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("입력값이 없습니다.");
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > 131072) {
      await reader.cancel();
      throw new Error("입력 크기가 너무 큽니다.");
    }
    chunks.push(value);
  }
  const buffer = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder().decode(buffer));
}
export function dbError(code: string | undefined) {
  if (code === "40001" || code === "23505")
    return {
      status: 409,
      error:
        "다른 변경과 충돌하거나 같은 기록이 이미 있습니다. 새로고침 후 다시 확인해 주세요.",
    };
  if (code === "42501")
    return {
      status: 403,
      error: "이 변경을 수행할 권한이 없거나 수정할 수 없는 원장입니다.",
    };
  if (["22023", "22007", "22008", "23503", "22P02"].includes(code ?? ""))
    return {
      status: 422,
      error:
        "입력값이나 연결 항목을 확인해 주세요. 정정 금액은 원거래 잔액을 초과해 차감할 수 없습니다.",
    };
  return {
    status: 503,
    error:
      "저장소 처리에 실패했습니다. 입력을 유지한 채 연결 상태를 확인해 주세요.",
  };
}
export async function boundedFormData(request: Request, maxBytes = 10_494_000) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("파일 입력이 없습니다.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new Error("최대 10MB까지 업로드할 수 있습니다.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return new Request(request.url, {
    method: "POST",
    headers: { "Content-Type": request.headers.get("content-type") ?? "" },
    body: bytes,
  }).formData();
}
