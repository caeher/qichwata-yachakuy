import fs from "node:fs/promises";
import path from "node:path";

import {
  getProcessSigningKey,
  sanitizeDownloadName,
  signStorageToken,
} from "@/lib/storage/sign-local";
import type { LocalSignOptions } from "@/lib/storage/memory";
import type { SignedUrlOptions, StorageProvider } from "@/lib/storage/types";

export function createLocalStorage(
  rootDir: string,
  options?: LocalSignOptions,
): StorageProvider {
  const root = path.resolve(rootDir);
  const signingKey = options?.signingKey ?? getProcessSigningKey();
  const nowSeconds =
    options?.nowSeconds ?? (() => Math.floor(Date.now() / 1000));

  function resolveKey(key: string) {
    const target = path.resolve(root, key);
    const relative = path.relative(root, target);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error("invalid_storage_key");
    }
    return target;
  }

  return {
    async put(key, body) {
      const filePath = resolveKey(key);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, body);
    },
    async get(key) {
      const filePath = resolveKey(key);
      try {
        const data = await fs.readFile(filePath);
        return new Uint8Array(data);
      } catch {
        return null;
      }
    },
    async delete(key) {
      const filePath = resolveKey(key);
      await fs.unlink(filePath).catch(() => undefined);
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
