import { FREE_MAX_UPLOAD_BYTES } from "@/db/constants";
import { sha256Hex } from "@/lib/uploads/hash";

const HEX_64 = /^[0-9a-fA-F]{64}$/;

export class VerifyInputError extends Error {
  constructor(
    message: string,
    readonly code:
      "invalid_input" | "invalid_hash" | "file_too_large" | "file_and_text",
  ) {
    super(message);
    this.name = "VerifyInputError";
  }
}

export type VerifyClaim = {
  sha256: string;
  claimedSha256: string | null;
};

export function normalizeHashHex(hex: string): string {
  if (!HEX_64.test(hex)) {
    throw new VerifyInputError("invalid_hash", "invalid_hash");
  }
  return hex.toLowerCase();
}

export function hashFromBytes(bytes: Uint8Array): string {
  if (bytes.byteLength > FREE_MAX_UPLOAD_BYTES) {
    throw new VerifyInputError("file_too_large", "file_too_large");
  }
  return sha256Hex(bytes);
}

export function hashFromText(text: string): string {
  const bytes = new TextEncoder().encode(text);
  return hashFromBytes(bytes);
}

export function buildVerifyClaim(input: {
  fileBytes?: Uint8Array;
  text?: string;
  hashHex?: string;
}): VerifyClaim {
  const hasFile = input.fileBytes !== undefined;
  const hasText = input.text !== undefined;
  const hasHex = input.hashHex !== undefined && input.hashHex.length > 0;

  if (hasFile && input.fileBytes!.byteLength === 0) {
    throw new VerifyInputError("invalid_input", "invalid_input");
  }

  if (hasFile && hasText) {
    throw new VerifyInputError("file_and_text", "file_and_text");
  }
  if (!hasFile && !hasText && !hasHex) {
    throw new VerifyInputError("invalid_input", "invalid_input");
  }

  if (hasHex && !hasFile && !hasText) {
    return {
      sha256: normalizeHashHex(input.hashHex!),
      claimedSha256: null,
    };
  }

  const computed = hasFile
    ? hashFromBytes(input.fileBytes!)
    : hashFromText(input.text!);

  const claimed =
    hasHex && input.hashHex ? normalizeHashHex(input.hashHex) : null;

  if (claimed && claimed !== computed) {
    return { sha256: computed, claimedSha256: claimed };
  }

  return { sha256: computed, claimedSha256: claimed };
}
