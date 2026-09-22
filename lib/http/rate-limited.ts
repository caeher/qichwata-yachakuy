import { NextResponse } from "next/server";

export function rateLimitedResponse(retryAfterSeconds: number): Response {
  return NextResponse.json(
    { error: "rate_limited", retryAfterSeconds },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds) },
    },
  );
}
