import type { NextRequest } from "next/server";

import { getDb } from "@/db/client";
import { handleClerkWebhook } from "@/lib/auth/clerk-webhook";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return new Response("Database not configured", { status: 503 });
  }
  const db = getDb();
  return handleClerkWebhook(db, req);
}

export async function GET() {
  return new Response("Not found", { status: 404 });
}
