import fs from "node:fs/promises";
import path from "node:path";

import type { ObjectStorage } from "@/lib/storage/types";

export function createLocalStorage(rootDir: string): ObjectStorage {
  const root = path.resolve(rootDir);

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
  };
}
