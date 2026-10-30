// Display names never become filesystem paths. Storage keeps its UUID names.
export function documentDownloadName(file: {
  filename: string;
  title: string;
  downloadName?: string;
}) {
  let name = file.downloadName;
  if (!name) {
    const match =
      /^(meeting|activity|purchase|details)_(\d{4})(\d{2})(\d{2})_/.exec(
        file.filename,
      );
    if (match) {
      const labels: Record<string, string> = {
        meeting: "회의록",
        activity: "활동비_증빙",
        purchase: "물품_구매_사유서",
        details: "창업활동자금_세부내역",
      };
      const number =
        match[1] === "meeting" ? /제(\d+)차/.exec(file.title)?.[1] : undefined;
      name = `SOMSSI_${labels[match[1]]}${number ? `_제${number}차` : ""}_${match[2]}-${match[3]}-${match[4]}.${match[1] === "details" ? "xlsx" : "docx"}`;
    } else if (file.filename === "SOMSSI_documents.zip")
      name = "SOMSSI_작성서류_전체.zip";
    else if (file.filename === "receipt_source.pdf")
      name = "SOMSSI_영수증_원본.pdf";
    else name = file.filename;
  }
  // Remove separators/control characters and prohibit header injection.
  return name
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f/\\:*?"<>|]/g, "_")
    .slice(0, 180);
}

export function documentAttachment(
  file: Parameters<typeof documentDownloadName>[0],
) {
  const name = documentDownloadName(file);
  const extension = /\.(docx|xlsx|pdf|zip)$/i.exec(file.filename)?.[1] ?? "bin";
  const encoded = encodeURIComponent(name).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename="SOMSSI_document.${extension}"; filename*=UTF-8''${encoded}`;
}
