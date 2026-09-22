import { NextResponse } from "next/server";

import { sessionContext } from "@/lib/api/session";
import { getDb } from "@/db/client";
import { documentErrorResponse } from "@/lib/api/document-errors";
import {
  createDraftDocument,
  listDocumentsForUser,
} from "@/lib/uploads/create-document";
import { resolveAppUser } from "@/lib/auth/resolve-app-user";
import { checkUploadRateLimit } from "@/lib/http/limits";
import { rateLimitedResponse } from "@/lib/http/rate-limited";
import { createObjectStorage } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 30 * 1024 * 1024;

export async function GET() {
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

  const db = getDb();
  const appUser = await resolveAppUser(db, session.userId, session.email);
  if (!appUser) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const documents = await listDocumentsForUser(db, appUser.id);
  return NextResponse.json({ documents });
}

export async function POST(req: Request) {
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

  const uploadRate = checkUploadRateLimit(session.userId);
  if (!uploadRate.ok) {
    return rateLimitedResponse(uploadRate.retryAfterSeconds);
  }

  const contentLength = req.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: "file_too_large", maxBytes: MAX_BODY_BYTES },
      { status: 413 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  if (buffer.byteLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: "file_too_large", maxBytes: MAX_BODY_BYTES },
      { status: 413 },
    );
  }

  const bytes = new Uint8Array(buffer);
  const nameField = form.get("name");
  const name =
    typeof nameField === "string" && nameField.trim().length > 0
      ? nameField.trim()
      : file.name;

  try {
    const db = getDb();
    const storage = createObjectStorage();
    const doc = await createDraftDocument(db, storage, {
      clerkUserId: session.userId,
      email: session.email,
      name,
      declaredMime: file.type,
      bytes,
    });
    return NextResponse.json(doc, { status: 201 });
  } catch (error) {
    return documentErrorResponse(error);
  }
}
