import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { getDb } from "@/db/client";
import { documentErrorResponse } from "@/lib/api/document-errors";
import { createDraftDocument } from "@/lib/uploads/create-document";
import { createObjectStorage } from "@/lib/storage";

export const runtime = "nodejs";

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

  let body: { text?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  if (typeof body.text !== "string") {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const name =
    typeof body.name === "string" && body.name.trim().length > 0
      ? body.name.trim()
      : "nota.txt";
  const bytes = new TextEncoder().encode(body.text);
  const declaredMime = name.toLowerCase().endsWith(".md")
    ? "text/markdown"
    : "text/plain";

  try {
    const db = getDb();
    const storage = createObjectStorage();
    const doc = await createDraftDocument(db, storage, {
      clerkUserId: session.userId,
      email: session.email,
      name,
      declaredMime,
      bytes,
    });
    return NextResponse.json(doc, { status: 201 });
  } catch (error) {
    return documentErrorResponse(error);
  }
}
