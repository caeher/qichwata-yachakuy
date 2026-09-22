import { QUOTA_ANCHORS } from "@/lib/api/quota-codes";

export function anchorQuotaExceededBody(included: number, used: number) {
  return {
    error: QUOTA_ANCHORS,
    included,
    used,
  };
}
