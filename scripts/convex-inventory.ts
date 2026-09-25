/**
 * Operator script: deployment inventory without PII.
 * Requires NEXT_PUBLIC_CONVEX_URL and CONVEX_DEPLOY_KEY in the environment.
 */
import { internal } from "../convex/_generated/api";
import { convexInternalQuery, convexConfigured } from "../lib/convex/server";

async function main() {
  if (!convexConfigured()) {
    console.error("NEXT_PUBLIC_CONVEX_URL is not set.");
    process.exit(1);
  }
  if (!process.env.CONVEX_DEPLOY_KEY?.trim()) {
    console.error("CONVEX_DEPLOY_KEY is not set.");
    process.exit(1);
  }

  const inventory = await convexInternalQuery(
    internal.inventory.deploymentInventory,
    {},
  );

  const report = {
    deploymentUrl: process.env.NEXT_PUBLIC_CONVEX_URL,
    queriedAt: new Date().toISOString(),
    tableCounts: inventory.tableCounts,
    courseSlugs: inventory.courseSlugs,
    draftEnrollmentDisabled: inventory.draftEnrollmentDisabled,
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
