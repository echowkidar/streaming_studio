/**
 * Cloudflare Tunnel rejects request bodies over 100MB. Files above CHUNK_THRESHOLD are uploaded in
 * parts through /api/uploads and the endpoint then receives `uploadId` instead of the file.
 */
export const CHUNK_THRESHOLD = 90 * 1024 * 1024;

async function jsonOrThrow(res: Response, what: string) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) throw new Error(json?.error || `${what} failed (HTTP ${res.status})`);
  return json;
}

export async function uploadInChunks(file: File, onProgress?: (fraction: number) => void): Promise<string> {
  const init = await jsonOrThrow(
    await fetch("/api/uploads/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: file.name, fileSize: file.size, mimeType: file.type || "application/octet-stream" }),
    }),
    "Upload init"
  );
  const { uploadId, chunkSize, totalChunks } = init.data as { uploadId: string; chunkSize: number; totalChunks: number };

  for (let i = 0; i < totalChunks; i++) {
    const part = file.slice(i * chunkSize, Math.min(file.size, (i + 1) * chunkSize));
    let attempt = 0;
    // retry each part a few times (flaky connections)
    for (;;) {
      try {
        await jsonOrThrow(
          await fetch(`/api/uploads/${uploadId}/chunk?index=${i}`, {
            method: "PUT",
            headers: { "Content-Type": "application/octet-stream" },
            body: part,
          }),
          `Uploading part ${i + 1}/${totalChunks}`
        );
        break;
      } catch (err) {
        attempt++;
        if (attempt >= 4) throw err;
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
    onProgress?.((i + 1) / totalChunks);
  }

  await jsonOrThrow(await fetch(`/api/uploads/${uploadId}/complete`, { method: "POST" }), "Upload finalize");
  return uploadId;
}

/** Append `file` to a FormData, switching to a chunked upload (`uploadId`) for big files. */
export async function appendFileOrChunked(
  formData: FormData,
  fieldName: string,
  file: File,
  onProgress?: (fraction: number) => void
): Promise<void> {
  if (file.size > CHUNK_THRESHOLD) {
    formData.append("uploadId", await uploadInChunks(file, onProgress));
  } else {
    formData.append(fieldName, file);
  }
}
