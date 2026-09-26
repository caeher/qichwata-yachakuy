import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { isProtectedPath } from "@/lib/auth/public-paths";
import { currentPathWithQuery } from "@/lib/auth/return-url";

const runClerk = clerkMiddleware(async (auth, req) => {
  if (isProtectedPath(req.nextUrl.pathname)) {
    await auth.protect();
  }
});

export default function proxy(request: NextRequest) {
  if (!process.env.CLERK_SECRET_KEY) {
    if (isProtectedPath(request.nextUrl.pathname)) {
      const signIn = new URL("/sign-in", request.url);
      signIn.searchParams.set("redirect_url", currentPathWithQuery(request.nextUrl));
      return NextResponse.redirect(signIn);
    }
    return NextResponse.next();
  }
  const res = runClerk(request, {} as never) as unknown as Promise<NextResponse>;
  return res.then((r) => {
    // Clerk's decorateRequest turns every NextResponse.next() into an
    // absolute self-rewrite (x-middleware-rewrite) to propagate auth
    // headers. Next 16 treats absolute self-rewrites as external and
    // re-fetches itself, re-running the proxy per rewrite -> infinite
    // loop (timeout on plain HTTP) or EPROTO 500 (behind TLS). A rewrite
    // to the same path carries no routing meaning, so convert it back to
    // next(): delete the rewrite marker and set x-middleware-next, keeping
    // Clerk's override headers (x-middleware-override-headers /
    // x-middleware-request-*) so auth still propagates downstream.
    const rewrite = r.headers.get("x-middleware-rewrite");
    if (rewrite) {
      try {
        const rewriteUrl = new URL(rewrite, request.url);
        if (
          rewriteUrl.pathname === request.nextUrl.pathname &&
          rewriteUrl.search === request.nextUrl.search
        ) {
          r.headers.delete("x-middleware-rewrite");
          r.headers.set("x-middleware-next", "1");
        }
      } catch {
        // Keep Clerk's original response on malformed URLs.
      }
    }
    return r;
  }) as never;
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
