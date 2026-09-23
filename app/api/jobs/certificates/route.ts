import { asc, inArray } from "drizzle-orm";
import { timingSafeEqual } from "node:crypto";

import { getDb } from "@/db/client";
import { certificates } from "@/db/schema";
import { getAnchorRuntimeConfig } from "@/lib/anchors/service";
import { runCertificateAnchorJob } from "@/lib/certificates/anchor-job";

export const runtime = "nodejs";

function authorized(request: Request, token: string) {
  const supplied =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = Buffer.from(supplied);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Called by a platform scheduler; retries are safe and bounded per invocation. */
export async function POST(request: Request) {
  const token = process.env.CERTIFICATE_WORKER_TOKEN?.trim();
  if (!token)
    return Response.json({ error: "worker_not_configured" }, { status: 503 });
  if (!authorized(request, token))
    return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!process.env.DATABASE_URL)
    return Response.json({ error: "database_unconfigured" }, { status: 503 });
  const db = getDb();
  const pending = await db.query.certificates.findMany({
    where: inArray(certificates.status, ["pending", "failed"]),
    orderBy: [asc(certificates.createdAt)],
    limit: 20,
  });
  const runtime = getAnchorRuntimeConfig();
  const outcomes = [];
  for (const certificate of pending) {
    try {
      outcomes.push(
        await runCertificateAnchorJob(
          db,
          runtime.configured ? runtime : null,
          certificate.id,
        ),
      );
    } catch {
      outcomes.push({
        publicId: certificate.publicId,
        status: "pending",
        error: "retryable",
      });
    }
  }
  return Response.json({ processed: outcomes.length, outcomes });
}
