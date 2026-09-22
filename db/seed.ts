import { fileURLToPath } from "node:url";

import {
  ENTERPRISE_MAX_UPLOAD_BYTES,
  ENTERPRISE_MONTHLY_ANCHORS,
  ENTERPRISE_STORAGE_LIMIT_BYTES,
  FREE_MAX_UPLOAD_BYTES,
  FREE_MONTHLY_ANCHORS,
  FREE_STORAGE_LIMIT_BYTES,
  PRO_MAX_UPLOAD_BYTES,
  PRO_MONTHLY_ANCHORS,
  PRO_STORAGE_LIMIT_BYTES,
} from "@/db/constants";
import { getDb } from "@/db/client";
import { plans } from "@/db/schema";
import type { TestDatabase } from "@/db/pglite";

type SeedDb = ReturnType<typeof getDb> | TestDatabase;

const planRows = [
  {
    slug: "free",
    name: "Gratis",
    storageLimitBytes: FREE_STORAGE_LIMIT_BYTES,
    maxUploadBytes: FREE_MAX_UPLOAD_BYTES,
    monthlyAnchorsIncluded: FREE_MONTHLY_ANCHORS,
    pricePerExtraAnchorCents: null,
    pricePerGbCents: null,
  },
  {
    slug: "pro",
    name: "Pro",
    storageLimitBytes: PRO_STORAGE_LIMIT_BYTES,
    maxUploadBytes: PRO_MAX_UPLOAD_BYTES,
    monthlyAnchorsIncluded: PRO_MONTHLY_ANCHORS,
    pricePerExtraAnchorCents: null,
    pricePerGbCents: null,
  },
  {
    slug: "enterprise",
    name: "Empresa",
    storageLimitBytes: ENTERPRISE_STORAGE_LIMIT_BYTES,
    maxUploadBytes: ENTERPRISE_MAX_UPLOAD_BYTES,
    monthlyAnchorsIncluded: ENTERPRISE_MONTHLY_ANCHORS,
    pricePerExtraAnchorCents: null,
    pricePerGbCents: null,
  },
] as const;

export async function seedPlans(db: SeedDb) {
  for (const row of planRows) {
    await db
      .insert(plans)
      .values(row)
      .onConflictDoUpdate({
        target: plans.slug,
        set: {
          name: row.name,
          storageLimitBytes: row.storageLimitBytes,
          maxUploadBytes: row.maxUploadBytes,
          monthlyAnchorsIncluded: row.monthlyAnchorsIncluded,
          pricePerExtraAnchorCents: row.pricePerExtraAnchorCents,
          pricePerGbCents: row.pricePerGbCents,
        },
      });
  }
}

async function main() {
  const db = getDb();
  await seedPlans(db);
  console.log("Plans seeded.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
