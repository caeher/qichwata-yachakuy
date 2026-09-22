import {
  getProcessSigningKey,
  sanitizeDownloadName,
  signStorageToken,
} from "@/lib/storage/sign-local";
import type { SignedUrlOptions, StorageProvider } from "@/lib/storage/types";

export type LocalSignOptions = {
  signingKey?: Uint8Array;
  nowSeconds?: () => number;
};

export function createMemoryStorage(
  options?: LocalSignOptions,
): StorageProvider {
  const store = new Map<string, Uint8Array>();
  const signingKey = options?.signingKey ?? getProcessSigningKey();
  const nowSeconds =
    options?.nowSeconds ?? (() => Math.floor(Date.now() / 1000));

  return {
    async put(key, body) {
      store.set(key, body);
    },
    async get(key) {
      return store.get(key) ?? null;
    },
    async delete(key) {
      store.delete(key);
    },
    async signedUrl(key, opts: SignedUrlOptions) {
      const exp = nowSeconds() + opts.expiresInSeconds;
      const n = opts.downloadName
        ? sanitizeDownloadName(opts.downloadName)
        : undefined;
      const payload = {
        k: key,
        e: exp,
        ...(n ? { n } : {}),
        ...(opts.contentType ? { c: opts.contentType } : {}),
      };
      const token = signStorageToken(payload, signingKey);
      return `/api/storage/download?token=${encodeURIComponent(token)}`;
    },
  };
}
