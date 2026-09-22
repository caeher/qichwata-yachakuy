import { NextResponse } from "next/server";

import { sessionContext } from "@/lib/api/session";
import { loadDocumentDetail } from "@/lib/anchors/document-detail";
import { getDb } from "@/db/client";
import { resolveAppUser } from "@/lib/auth/resolve-app-user";

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
