const HEX_64 = /^[0-9a-fA-F]{64}$/;

export class VerifyInputError extends Error {
  constructor(
    message: string,
    readonly code: "invalid_input" | "invalid_hash",
  ) {
    super(message);
    this.name = "VerifyInputError";
  }
}

export type VerifyClaim = {
  sha256: string;
};

export function normalizeHashHex(hex: string): string {
  if (!HEX_64.test(hex)) {
    throw new VerifyInputError("invalid_hash", "invalid_hash");
  }
  return hex.toLowerCase();
}

export function buildVerifyClaim(input: { hashHex?: string }): VerifyClaim {
  if (input.hashHex === undefined || input.hashHex.length === 0) {
    throw new VerifyInputError("invalid_input", "invalid_input");
  }

  return { sha256: normalizeHashHex(input.hashHex) };
}
