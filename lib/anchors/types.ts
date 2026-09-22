import type { DocumentDetail } from "@/lib/anchors/document-detail";

export type AnchorJobResult =
  | { status: "anchored"; detail: DocumentDetail }
  | { status: "pending"; detail: DocumentDetail; warning?: string }
  | { status: "failed"; detail: DocumentDetail }
  | { error: "anchor_quota_exceeded"; included: number; used: number }
  | { error: "hash_already_anchored"; sha256: string }
  | { error: "anchor_failed" }
  | { error: "not_found" };
