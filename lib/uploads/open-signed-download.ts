import {
  sanitizeDownloadName,
  verifyStorageToken,
} from "@/lib/storage/sign-local";
import type { StorageProvider } from "@/lib/storage/types";

export async function openSignedDownload(
  storage: StorageProvider,
  token: string,
  signingKey: Uint8Array,
  nowSeconds: number,
): Promise<{
  body: Uint8Array;
  downloadName: string;
  contentType: string;
} | null> {
  const payload = verifyStorageToken(token, signingKey, nowSeconds);
  if (!payload) {
    return null;
  }

  const body = await storage.get(payload.k);
  if (!body) {
    return null;
  }

  const downloadName = sanitizeDownloadName(payload.n);
  const contentType = payload.c?.trim() || "application/octet-stream";

  return { body, downloadName, contentType };
}
