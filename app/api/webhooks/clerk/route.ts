import type { NextRequest } from "next/server";

import { handleClerkWebhook } from "@/lib/auth/clerk-webhook";
import { legacyDb } from "@/lib/db/legacy-db";
import { convexConfigured } from "@/lib/convex/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!convexConfigured() && !process.env.DATABASE_URL) {
    return new Response("Database not configured", { status: 503 });
  }
  return handleClerkWebhook(legacyDb(), req);
}

export async function GET() {
  return new Response("Not found", { status: 404 });
}
