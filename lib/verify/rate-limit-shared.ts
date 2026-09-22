import { consumeToken } from "@/lib/verify/rate-limit";

const VERIFY_LIMIT = 30;
const VERIFY_WINDOW_MS = 60_000;

const store = new Map<string, { timestamps: number[] }>();

export function checkVerifyRateLimit(
  ip: string,
  now: number = Date.now(),
): ReturnType<typeof consumeToken> {
  return consumeToken({
    key: ip,
    now,
    store,
    limit: VERIFY_LIMIT,
    windowMs: VERIFY_WINDOW_MS,
  });
}
