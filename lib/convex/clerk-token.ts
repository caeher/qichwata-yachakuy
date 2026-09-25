import { auth } from "@clerk/nextjs/server";

function isMissingConvexJwtTemplate(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const status = "status" in error ? error.status : undefined;
  const message =
    "message" in error && typeof error.message === "string"
      ? error.message
      : "";
  const clerkErrors =
    "errors" in error && Array.isArray(error.errors) ? error.errors : [];
  const clerkCode = clerkErrors[0] && typeof clerkErrors[0] === "object"
    ? (clerkErrors[0] as { code?: string }).code
    : undefined;
  return (
    status === 404 ||
    clerkCode === "resource_not_found" ||
    message.includes("Not Found")
  );
}

/**
 * Clerk JWT for Convex (`aud: convex`). Requires Dashboard → JWT templates → Convex.
 * Issuer must match `CLERK_JWT_ISSUER_DOMAIN` on the Convex deployment.
 */
export async function getClerkConvexToken(): Promise<string | null> {
  const session = await auth();
  try {
    return await session.getToken({ template: "convex" });
  } catch (error) {
    if (isMissingConvexJwtTemplate(error)) {
      console.warn(
        '[auth] Clerk JWT template "convex" not found. In Clerk Dashboard open JWT templates, add the "Convex" preset, then set CLERK_JWT_ISSUER_DOMAIN on your Convex deployment (see docs/LOCAL_SETUP.md).',
      );
      return null;
    }
    throw error;
  }
}
