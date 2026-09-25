import { getDb } from "@/db/client";
import type { AuthDb } from "@/lib/auth/provision-user";
import { convexConfigured } from "@/lib/convex/server";

/** Drizzle DB for tests and legacy paths; null when Convex is the active store. */
export function legacyDb(): AuthDb {
  if (convexConfigured()) {
    return null as never;
  }
  return getDb();
}
