import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

import { sessionContext } from "@/lib/api/session";
import { checkDownloadRateLimit } from "@/lib/http/limits";
import { rateLimitedResponse } from "@/lib/http/rate-limited";
import { getDb } from "@/db/client";
import { documents } from "@/db/schema";
import { resolveAppUser } from "@/lib/auth/resolve-app-user";
import { createObjectStorage } from "@/lib/storage";
import { resolveSignedUrlTtl } from "@/lib/storage/ttl";
import { keyBelongsToUser } from "@/lib/uploads/storage-key";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await sessionContext();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "database_unconfigured" },
      { status: 503 },
    );
  }

  const { id } = await params;
  const db = getDb();
  const appUser = await resolveAppUser(db, session.userId, session.email);
  if (!appUser) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const downloadRate = checkDownloadRateLimit(session.userId);
  if (!downloadRate.ok) {
    return rateLimitedResponse(downloadRate.retryAfterSeconds);
  }

  const doc = await db.query.documents.findFirst({
    where: and(
      eq(documents.id, id),
      eq(documents.userId, appUser.id),
      isNull(documents.deletedAt),
    ),
  });

  if (!doc) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (!keyBelongsToUser(doc.storageKey, appUser.id)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const ttl = resolveSignedUrlTtl();
  const storage = createObjectStorage();
  const url = await storage.signedUrl(doc.storageKey, {
    expiresInSeconds: ttl,
    downloadName: doc.name,
    contentType: doc.mimeType,
  });
  const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

  return NextResponse.json({ url, expiresAt });
}
