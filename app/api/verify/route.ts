import { NextResponse } from "next/server";

import { getDb } from "@/db/client";
import { FREE_MAX_UPLOAD_BYTES } from "@/db/constants";
import { createChainLookup } from "@/lib/verify/chain";
import { buildVerifyClaim, VerifyInputError } from "@/lib/verify/hash-input";
import { ChainUnavailableError, lookupWithClaim } from "@/lib/verify/lookup";
import { rateLimitedResponse } from "@/lib/http/rate-limited";
import { clientIp } from "@/lib/verify/rate-limit";
import { checkVerifyRateLimit } from "@/lib/verify/rate-limit-shared";

export const runtime = "nodejs";

export async function POST(request: Request) {
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

  const contentType = request.headers.get("content-type") ?? "";
  let claim;
  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      const text = form.get("text");
      const hash = form.get("hash");
      const hasFile = file instanceof File;
      const hasText = typeof text === "string";
      if (hasFile && hasText) {
        return NextResponse.json({ error: "invalid_input" }, { status: 400 });
      }
      if (hasFile) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        claim = buildVerifyClaim({
          fileBytes: bytes,
          hashHex: typeof hash === "string" ? hash : undefined,
        });
      } else if (hasText) {
        claim = buildVerifyClaim({
          text,
          hashHex: typeof hash === "string" ? hash : undefined,
        });
      } else if (typeof hash === "string" && hash.length > 0) {
        claim = buildVerifyClaim({ hashHex: hash });
      } else {
        return NextResponse.json({ error: "invalid_input" }, { status: 400 });
      }
    } else {
      const body = (await request.json()) as {
        text?: string;
        hash?: string;
      };
      if (body.text !== undefined && body.hash !== undefined) {
        return NextResponse.json({ error: "invalid_input" }, { status: 400 });
      }
      if (body.text !== undefined) {
        claim = buildVerifyClaim({ text: body.text });
      } else if (body.hash !== undefined) {
        claim = buildVerifyClaim({ hashHex: body.hash });
      } else {
        return NextResponse.json({ error: "invalid_input" }, { status: 400 });
      }
    }
  } catch (error) {
    if (error instanceof VerifyInputError) {
      if (error.code === "file_too_large") {
        return NextResponse.json(
          { error: "file_too_large", maxBytes: FREE_MAX_UPLOAD_BYTES },
          { status: 413 },
        );
      }
      return NextResponse.json({ error: error.code }, { status: 400 });
    }
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const db = getDb();
  const contractId = process.env.STELLAR_CONTRACT_ID?.trim() || null;
  const chain = createChainLookup();

  try {
    const result = await lookupWithClaim(db, chain, claim, contractId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ChainUnavailableError) {
      return NextResponse.json({ error: "chain_unavailable" }, { status: 503 });
    }
    throw error;
  }
}
