import { consumeToken } from "@/lib/http/rate-limit";

const WINDOW_MS = 60_000;

const uploadStore = new Map<string, { timestamps: number[] }>();
const anchorStore = new Map<string, { timestamps: number[] }>();
const downloadStore = new Map<string, { timestamps: number[] }>();

const UPLOAD_LIMIT = 10;
const ANCHOR_LIMIT = 5;
const DOWNLOAD_LIMIT = 30;

export function checkUploadRateLimit(
  userId: string,
  now: number = Date.now(),
): ReturnType<typeof consumeToken> {
  return consumeToken({
    key: userId,
    now,
    store: uploadStore,
    limit: UPLOAD_LIMIT,
    windowMs: WINDOW_MS,
  });
}

export function checkAnchorRateLimit(
  userId: string,
  now: number = Date.now(),
): ReturnType<typeof consumeToken> {
  return consumeToken({
    key: userId,
    now,
    store: anchorStore,
    limit: ANCHOR_LIMIT,
    windowMs: WINDOW_MS,
  });
}

export function checkDownloadRateLimit(
  userId: string,
  now: number = Date.now(),
): ReturnType<typeof consumeToken> {
  return consumeToken({
    key: userId,
    now,
    store: downloadStore,
    limit: DOWNLOAD_LIMIT,
    windowMs: WINDOW_MS,
  });
}
