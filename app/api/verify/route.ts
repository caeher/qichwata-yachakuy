import { NextResponse } from "next/server";

import { getDb } from "@/db/client";
import { retiredResourceResponse } from "@/lib/api/retired-resource";
import { rateLimitedResponse } from "@/lib/http/rate-limited";
import { createChainLookup } from "@/lib/verify/chain";
import { buildVerifyClaim, VerifyInputError } from "@/lib/verify/hash-input";
import { ChainUnavailableError, lookupAnchor } from "@/lib/verify/lookup";
import { clientIp } from "@/lib/verify/rate-limit";
import { checkVerifyRateLimit } from "@/lib/verify/rate-limit-shared";
import { verifyCertificateByHash } from "@/lib/certificates/verify";
import { resolveStellarEndpoints } from "@/lib/stellar/endpoints";
import { certificates } from "@/db/schema";
import { eq } from "drizzle-orm";
import { normalizeHashHex } from "@/lib/verify/hash-input";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    return retiredResourceResponse();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const payload = body as {
    hash?: unknown;
    text?: unknown;
    certificateId?: unknown;
  };
  if (payload.text !== undefined) {
    return retiredResourceResponse();
  }

  const certificateId =
    typeof payload.certificateId === "string" ? payload.certificateId : null;
  let sha256: string | null = null;
  if (certificateId) {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        certificateId,
      )
    ) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }
  } else {
    try {
      sha256 = buildVerifyClaim({
        hashHex: typeof payload.hash === "string" ? payload.hash : undefined,
      }).sha256;
    } catch (error) {
      if (error instanceof VerifyInputError) {
        return NextResponse.json({ error: error.code }, { status: 400 });
      }
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }
  }

  const rate = checkVerifyRateLimit(clientIp(request.headers));
  if (!rate.ok) {
    return rateLimitedResponse(rate.retryAfterSeconds);
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "database_unconfigured" },
      { status: 503 },
    );
  }

  const db = getDb();
  if (certificateId) {
    const certificate = await db.query.certificates.findFirst({
      where: eq(certificates.publicId, certificateId),
    });
    if (!certificate) {
      return NextResponse.json({ status: "unknown", certificateId });
    }
    sha256 = normalizeHashHex(certificate.sha256);
  }
  if (!sha256)
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  const contractId = process.env.STELLAR_CONTRACT_ID?.trim() || null;
  const chain = createChainLookup();

  try {
    const certificate = await verifyCertificateByHash(db, chain, sha256, {
      network: resolveStellarEndpoints().network,
      contractId,
    });
    if (certificate.status !== "unknown") {
      return NextResponse.json(certificate);
    }
    const result = await lookupAnchor(db, chain, sha256, contractId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ChainUnavailableError) {
      return NextResponse.json({ error: "chain_unavailable" }, { status: 503 });
    }
    throw error;
  }
}
