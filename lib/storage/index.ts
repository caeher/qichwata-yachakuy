import { createLocalStorage } from "@/lib/storage/local";
import { createMemoryStorage } from "@/lib/storage/memory";
import { createS3Storage } from "@/lib/storage/s3";
import type { StorageProvider } from "@/lib/storage/types";

export function createObjectStorage(
  override?: Partial<{ driver: string; localDir: string }>,
): StorageProvider {
  const driver = override?.driver ?? process.env.STORAGE_DRIVER ?? "local";
  if (driver === "memory") {
    return createMemoryStorage();
  }
  if (driver === "s3") {
    return createS3Storage();
  }
  const localDir =
    override?.localDir ?? process.env.STORAGE_LOCAL_DIR ?? ".data/objects";
  return createLocalStorage(localDir);
}
