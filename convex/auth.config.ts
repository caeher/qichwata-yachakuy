import type { AuthConfig } from "convex/server";

/**
 * Requires CLERK_JWT_ISSUER_DOMAIN on the Convex deployment (Clerk JWT template "Convex").
 */
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
