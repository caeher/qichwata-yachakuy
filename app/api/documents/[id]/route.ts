import { NextResponse } from "next/server";

import { sessionContext } from "@/lib/api/session";
import { loadDocumentDetail } from "@/lib/anchors/document-detail";
import { getDb } from "@/db/client";
import { resolveAppUser } from "@/lib/auth/resolve-app-user";
import {
  deleteDocumentForUser,
  DocumentNotFoundForDeleteError,
  DocumentPendingDeleteError,
} from "@/lib/uploads/delete-document";
import { createObjectStorage } from "@/lib/storage";

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

  const detail = await loadDocumentDetail(db, appUser.id, id);
  if (!detail) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json(detail);
}

export async function DELETE(_request: Request, { params }: Params) {
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

  try {
    const storage = createObjectStorage();
    await deleteDocumentForUser(db, storage, appUser.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof DocumentNotFoundForDeleteError) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (error instanceof DocumentPendingDeleteError) {
      return NextResponse.json({ error: "document_pending" }, { status: 409 });
    }
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
