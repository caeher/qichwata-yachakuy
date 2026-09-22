import { NextResponse } from "next/server";

import { sessionContext } from "@/lib/api/session";
import { runAnchorJob } from "@/lib/anchors/job";
import { getAnchorRuntimeConfig } from "@/lib/anchors/service";
import { getDb } from "@/db/client";
import { resolveAppUser } from "@/lib/auth/resolve-app-user";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
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

  const runtime = getAnchorRuntimeConfig();
  if (!runtime.configured) {
    return NextResponse.json(
      { error: "anchor_unconfigured" },
      { status: 503 },
    );
  }

  const { id } = await params;
  const db = getDb();
  const appUser = await resolveAppUser(db, session.userId, session.email);
  if (!appUser) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await runAnchorJob(db, runtime.chain, {
    userId: appUser.id,
    documentId: id,
    network: runtime.network,
    contractId: runtime.contractId,
    operatorPublicKey: runtime.operatorPublicKey,
  });

  if ("error" in result) {
    if (result.error === "not_found") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (result.error === "anchor_quota_exceeded") {
      return NextResponse.json(
        {
          error: "anchor_quota_exceeded",
          included: result.included,
          used: result.used,
        },
        { status: 409 },
      );
    }
    if (result.error === "hash_already_anchored") {
      return NextResponse.json(
        { error: "hash_already_anchored", sha256: result.sha256 },
        { status: 409 },
      );
    }
    if (result.error === "anchor_failed") {
      return NextResponse.json({ error: "anchor_failed" }, { status: 422 });
    }
    return NextResponse.json({ error: "anchor_failed" }, { status: 422 });
  }

  if (result.status === "pending") {
    return NextResponse.json(result.detail, { status: 202 });
  }
  if (result.status === "failed") {
    return NextResponse.json(result.detail, { status: 422 });
  }
  return NextResponse.json(result.detail, { status: 200 });
}
