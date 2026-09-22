import type { ObjectStorage } from "@/lib/storage/types";

export function createMemoryStorage(): ObjectStorage {
  const store = new Map<string, Uint8Array>();

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
  };
}
