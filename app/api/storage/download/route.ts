import { NextResponse } from "next/server";

import { createObjectStorage } from "@/lib/storage";
import { getProcessSigningKey } from "@/lib/storage/sign-local";
import { openSignedDownload } from "@/lib/uploads/open-signed-download";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const storage = createObjectStorage();
  const signingKey = getProcessSigningKey();
  const nowSeconds = Math.floor(Date.now() / 1000);
  const result = await openSignedDownload(
    storage,
    token,
    signingKey,
    nowSeconds,
  );

  if (!result) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const disposition = `attachment; filename="${result.downloadName}"`;
  return new NextResponse(Buffer.from(result.body), {
    status: 200,
    headers: {
      "Content-Type": result.contentType,
      "Content-Disposition": disposition,
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
