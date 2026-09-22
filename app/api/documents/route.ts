import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { getDb } from "@/db/client";
import { documentErrorResponse } from "@/lib/api/document-errors";
import {
  createDraftDocument,
  listDocumentsForUser,
} from "@/lib/uploads/create-document";
import { resolveAppUser } from "@/lib/auth/resolve-app-user";
import { createObjectStorage } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 30 * 1024 * 1024;

async function sessionContext() {
  if (!process.env.CLERK_SECRET_KEY) {
    return null;
  }
  const { userId } = await auth();
  if (!userId) {
    return null;
  }
  const clerkUser = await currentUser();
  const email =
    clerkUser?.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId,
    )?.emailAddress ??
    clerkUser?.emailAddresses[0]?.emailAddress ??
    null;
  return { userId, email };
}

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
