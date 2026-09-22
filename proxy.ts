import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isProtected(pathname: string) {
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    return true;
  }
  if (!pathname.startsWith("/api/")) {
    return false;
  }
  if (
    pathname === "/api/webhooks/clerk" ||
    pathname.startsWith("/api/webhooks/clerk/")
  ) {
    return false;
  }
  return true;
}

const runClerk = clerkMiddleware(async (auth, req) => {
  if (isProtected(req.nextUrl.pathname)) {
    await auth.protect();
  }
});

export default function proxy(request: NextRequest) {
  if (!process.env.CLERK_SECRET_KEY) {
    if (isProtected(request.nextUrl.pathname)) {
      const signIn = new URL("/sign-in", request.url);
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
    "/__clerk/(.*)",
  ],
};
