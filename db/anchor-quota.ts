import { and, eq, gte, isNull, lt } from "drizzle-orm";

import type { Database } from "@/db/client";
import type { TestDatabase } from "@/db/pglite";
import { anchors, documents, plans, usageEvents, users } from "@/db/schema";

type QuotaDb = Database | TestDatabase;
type Tx = Parameters<Parameters<QuotaDb["transaction"]>[0]>[0];

export class AnchorQuotaExceededError extends Error {
  readonly included: number;
  readonly used: number;

  constructor(included: number, used: number) {
    super("anchor_quota_exceeded");
    this.name = "AnchorQuotaExceededError";
    this.included = included;
    this.used = used;
  }
}

export class DocumentNotFoundError extends Error {
  constructor() {
    super("not_found");
    this.name = "DocumentNotFoundError";
  }
}

export class HashAlreadyAnchoredError extends Error {
  readonly sha256: string;

  constructor(sha256: string) {
    super("hash_already_anchored");
    this.name = "HashAlreadyAnchoredError";
    this.sha256 = sha256;
  }
}

function startOfUtcMonth(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function startOfNextUtcMonth(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

export async function countAnchorUsage(
  tx: Tx,
  userId: string,
  now: Date,
  excludeDocumentId?: string,
) {
  const windowStart = startOfUtcMonth(now);
  const windowEnd = startOfNextUtcMonth(now);

  const usageRows = await tx
    .select({ id: usageEvents.id })
    .from(usageEvents)
    .where(
      and(
        eq(usageEvents.userId, userId),
        eq(usageEvents.type, "anchor"),
        gte(usageEvents.createdAt, windowStart),
        lt(usageEvents.createdAt, windowEnd),
      ),
    );

  const pendingDocs = await tx
    .select({ id: documents.id })
    .from(documents)
    .where(
      and(
        eq(documents.userId, userId),
        eq(documents.status, "pending"),
        isNull(documents.deletedAt),
      ),
    );

  const pendingCount = pendingDocs.filter(
    (row) => row.id !== excludeDocumentId,
  ).length;

  return usageRows.length + pendingCount;
}

export async function countSuccessfulAnchorsThisMonth(
  db: QuotaDb,
  userId: string,
  now: Date = new Date(),
): Promise<number> {
  const windowStart = startOfUtcMonth(now);
  const windowEnd = startOfNextUtcMonth(now);

  const usageRows = await db
    .select({ id: usageEvents.id })
    .from(usageEvents)
    .where(
      and(
        eq(usageEvents.userId, userId),
        eq(usageEvents.type, "anchor"),
        gte(usageEvents.createdAt, windowStart),
        lt(usageEvents.createdAt, windowEnd),
      ),
    );

  return usageRows.length;
}

export type ReserveAnchorResult =
  | { kind: "already"; anchorId: string }
  | { kind: "poll"; txHash: string; sha256: string }
  | { kind: "in_progress" }
  | { kind: "submit"; sha256: string };

export async function reserveAnchor(
  db: QuotaDb,
  input: { userId: string; documentId: string; now?: Date },
): Promise<ReserveAnchorResult> {
  const now = input.now ?? new Date();

  return db.transaction(async (tx) => {
    await tx
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, input.userId), isNull(users.deletedAt)))
      .for("update");

    const locked = await tx
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.id, input.documentId),
          eq(documents.userId, input.userId),
          isNull(documents.deletedAt),
        ),
      )
      .for("update");

    const doc = locked[0];
    if (!doc) {
      throw new DocumentNotFoundError();
    }

    if (doc.status === "anchored") {
      const existing = await tx.query.anchors.findFirst({
        where: eq(anchors.documentId, doc.id),
      });
      if (!existing) {
        throw new DocumentNotFoundError();
      }
      return { kind: "already", anchorId: existing.id };
    }

    if (doc.status === "pending") {
      if (doc.pendingTxHash) {
        return {
          kind: "poll",
          txHash: doc.pendingTxHash,
          sha256: doc.sha256,
        };
      }
      if (
        doc.pendingAt &&
        now.getTime() - doc.pendingAt.getTime() < 2 * 60 * 1000
      ) {
        return { kind: "in_progress" };
      }
      return { kind: "submit", sha256: doc.sha256 };
    }

    const planRow = await tx
      .select({ included: plans.monthlyAnchorsIncluded })
      .from(users)
      .innerJoin(plans, eq(plans.id, users.planId))
      .where(eq(users.id, input.userId));

    const included = planRow[0]?.included ?? 0;
    const used = await countAnchorUsage(tx, input.userId, now, doc.id);
    if (used >= included) {
      throw new AnchorQuotaExceededError(included, used);
    }

    if (doc.status === "draft" || doc.status === "failed") {
      await tx
        .update(documents)
        .set({
          status: "pending",
          pendingTxHash: null,
          pendingAt: now,
        })
        .where(eq(documents.id, doc.id));
      return { kind: "submit", sha256: doc.sha256 };
    }

    throw new DocumentNotFoundError();
  });
}

export async function setPendingTxHash(
  db: QuotaDb,
  documentId: string,
  txHash: string,
) {
  await db
    .update(documents)
    .set({ pendingTxHash: txHash })
    .where(eq(documents.id, documentId));
}

export async function settleAnchor(
  db: QuotaDb,
  input: {
    userId: string;
    documentId: string;
    sha256: string;
    network: "testnet" | "mainnet";
    txHash: string;
    ledger: number | null;
    contractId: string;
    feeXlm: string | null;
  },
) {
  try {
    await db.transaction(async (tx) => {
      await tx.insert(anchors).values({
        documentId: input.documentId,
        network: input.network,
        txHash: input.txHash,
        ledger: input.ledger,
        contractId: input.contractId,
        feeXlm: input.feeXlm,
      });

      await tx
        .update(documents)
        .set({
          status: "anchored",
          pendingTxHash: null,
          pendingAt: null,
        })
        .where(eq(documents.id, input.documentId));

      await tx.insert(usageEvents).values({
        userId: input.userId,
        type: "anchor",
        bytesDelta: 0,
        meta: {
          documentId: input.documentId,
          txHash: input.txHash,
          sha256: input.sha256,
        },
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const pgCode =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof (error as { code: unknown }).code === "string"
        ? (error as { code: string }).code
        : "";
    const causeCode =
      typeof error === "object" &&
      error !== null &&
      "cause" in error &&
      typeof (error as { cause: unknown }).cause === "object" &&
      (error as { cause: { code?: string } }).cause?.code
        ? (error as { cause: { code: string } }).cause.code
        : "";
    if (
      pgCode === "23505" ||
      causeCode === "23505" ||
      message.includes("anchors_tx_hash_uidx") ||
      message.includes("unique")
    ) {
      const existing = await db.query.anchors.findFirst({
        where: eq(anchors.txHash, input.txHash),
      });
      if (existing?.documentId === input.documentId) {
        return;
      }
      throw new HashAlreadyAnchoredError(input.sha256);
    }
    throw error;
  }
}

export async function failAnchor(db: QuotaDb, documentId: string) {
  await db
    .update(documents)
    .set({ status: "failed" })
    .where(eq(documents.id, documentId));
}

export async function resetDocumentToDraft(db: QuotaDb, documentId: string) {
  await db
    .update(documents)
    .set({
      status: "draft",
      pendingTxHash: null,
      pendingAt: null,
    })
    .where(eq(documents.id, documentId));
}
