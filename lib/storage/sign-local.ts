import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export type StorageTokenPayload = {
  k: string;
  e: number;
  n?: string;
  c?: string;
};

let processSigningKey: Uint8Array | null = null;

export function getProcessSigningKey(
  env: Record<string, string | undefined> = process.env,
): Uint8Array {
  const secret = env.STORAGE_URL_SIGNING_SECRET?.trim();
  if (secret && secret.length > 0) {
    return new TextEncoder().encode(secret);
  }
  if (!processSigningKey) {
    processSigningKey = new Uint8Array(randomBytes(32));
  }
  return processSigningKey;
}

export function sanitizeDownloadName(name: string | undefined): string {
  if (!name) {
    return "document";
  }
  const segments = name.split(/[/\\]/);
  let base = segments[segments.length - 1] ?? "";
  base = base.replace(/["\r\n;]/g, "").trim();
  if (base.length > 200) {
    base = base.slice(0, 200);
  }
  return base.length > 0 ? base : "document";
}

function base64UrlEncode(data: Uint8Array | string): string {
  const bytes =
    typeof data === "string" ? new TextEncoder().encode(data) : data;
  return Buffer.from(bytes).toString("base64url");
}

function base64UrlDecode(str: string): Uint8Array | null {
  try {
    return new Uint8Array(Buffer.from(str, "base64url"));
  } catch {
    return null;
  }
}

function hmacSign(message: string, key: Uint8Array): string {
  return createHmac("sha256", key).update(message).digest("base64url");
}

export function signStorageToken(
  payload: StorageTokenPayload,
  key: Uint8Array,
): string {
  const json = JSON.stringify(payload);
  const payloadPart = base64UrlEncode(json);
  const sig = hmacSign(payloadPart, key);
  return `${payloadPart}.${sig}`;
}

export function verifyStorageToken(
  token: string,
  key: Uint8Array,
  nowSeconds: number,
): StorageTokenPayload | null {
  const dot = token.indexOf(".");
  if (dot <= 0) {
    return null;
  }
  const payloadPart = token.slice(0, dot);
  const sigPart = token.slice(dot + 1);
  if (!payloadPart || !sigPart) {
    return null;
  }

  const expectedSig = hmacSign(payloadPart, key);
  const sigBuf = Buffer.from(sigPart);
  const expectedBuf = Buffer.from(expectedSig);
  if (
    sigBuf.length !== expectedBuf.length ||
    !timingSafeEqual(sigBuf, expectedBuf)
  ) {
    return null;
  }

  const jsonBytes = base64UrlDecode(payloadPart);
  if (!jsonBytes) {
    return null;
  }

  let parsed: StorageTokenPayload;
  try {
    parsed = JSON.parse(
      new TextDecoder().decode(jsonBytes),
    ) as StorageTokenPayload;
  } catch {
    return null;
  }

  if (
    typeof parsed.k !== "string" ||
    typeof parsed.e !== "number" ||
    !Number.isFinite(parsed.e)
  ) {
    return null;
  }
  if (parsed.e <= nowSeconds) {
    return null;
  }
  if (parsed.n !== undefined && typeof parsed.n !== "string") {
    return null;
  }
  if (parsed.c !== undefined && typeof parsed.c !== "string") {
    return null;
  }

  return parsed;
}
