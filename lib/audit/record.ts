import { auditEvents } from "@/db/schema";
import type { AuthDb } from "@/lib/auth/provision-user";

const ALLOWED_META_KEYS = new Set([
  "sha256",
  "txHash",
  "network",
  "included",
  "used",
  "certificateId",
]);

export type AuditAction =
  | "anchor_submit"
  | "anchor_settled"
  | "anchor_failed"
  | "anchor_quota"
  | "anchor_reconcile_missing_tx"
  | "document_delete"
  | "account_erasure"
  | "certificate_issue"
  | "certificate_anchor_submit"
  | "certificate_anchor_settled"
  | "certificate_anchor_failed"
  | "certificate_reconcile";

function sanitizeMeta(
  meta?: Record<string, string | number | null>,
): Record<string, string | number | null> {
  if (!meta) {
    return {};
  }
  const out: Record<string, string | number | null> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (ALLOWED_META_KEYS.has(key)) {
      out[key] = value;
    }
  }
  return out;
}

export async function recordAudit(
  db: AuthDb,
  input: {
    userId: string | null;
    action: AuditAction;
    documentId?: string | null;
    certificateId?: string | null;
    meta?: Record<string, string | number | null>;
  },
): Promise<void> {
  await db.insert(auditEvents).values({
    userId: input.userId,
    action: input.action,
    documentId: input.documentId ?? null,
    certificateId: input.certificateId ?? null,
    meta: sanitizeMeta(input.meta),
  });
}
