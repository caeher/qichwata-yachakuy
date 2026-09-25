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
  return runClerk(request, {} as never);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
