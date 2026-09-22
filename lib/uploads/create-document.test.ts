import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";

import {
  FREE_MAX_UPLOAD_BYTES,
  FREE_STORAGE_LIMIT_BYTES,
} from "@/db/constants";
import { QuotaExceededError, UploadTooLargeError } from "@/db/quota";
import { createTestDb } from "@/db/pglite";
import { seedPlans } from "@/db/seed";
import { documents, usageEvents, users } from "@/db/schema";
import { provisionFreePlan } from "@/lib/auth/provision-user";
import { createMemoryStorage } from "@/lib/storage/memory";
import { sha256Hex } from "@/lib/uploads/hash";
import { createDraftDocument } from "@/lib/uploads/create-document";

const PNG_HEADER = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0,
]);

describe("createDraftDocument", () => {
  async function setupUser(clerkUserId = "clerk_upload") {
    const { db } = await createTestDb();
    await seedPlans(db);
    const { userId } = await provisionFreePlan(db, {
      clerkUserId,
      email: "u@example.com",
    });
    return { db, userId };
  }

  it("stores draft document, updates quota, and records usage", async () => {
    const { db, userId } = await setupUser();
    const storage = createMemoryStorage();

    const dto = await createDraftDocument(db, storage, {
      clerkUserId: "clerk_upload",
      email: "u@example.com",
      name: "f.png",
      declaredMime: "image/png",
      bytes: PNG_HEADER,
    });

    expect(dto.sha256).toBe(sha256Hex(PNG_HEADER));
    expect(dto.status).toBe("draft");

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    expect(user?.storageUsedBytes).toBe(PNG_HEADER.byteLength);

    const events = await db
      .select()
      .from(usageEvents)
      .where(eq(usageEvents.userId, userId));
    expect(events.some((e) => e.type === "upload")).toBe(true);

    const doc = await db.query.documents.findFirst({
      where: eq(documents.id, dto.id),
    });
    const stored = await storage.get(doc!.storageKey);
    expect(stored).toEqual(PNG_HEADER);
  });

  it("rejects quota overflow without calling put", async () => {
    const { db, userId } = await setupUser("clerk_quota");
    const put = vi.fn();
    const storage = {
      put,
      get: async () => null,
      delete: async () => {},
      signedUrl: async () => "/api/storage/download?token=x",
    };

    await db
      .update(users)
      .set({
        storageUsedBytes: FREE_STORAGE_LIMIT_BYTES - 500,
      })
      .where(eq(users.id, userId));

    const big = new TextEncoder().encode("y".repeat(1000));
    await expect(
      createDraftDocument(db, storage, {
        clerkUserId: "clerk_quota",
        email: null,
        name: "big.txt",
        declaredMime: "text/plain",
        bytes: big,
      }),
    ).rejects.toBeInstanceOf(QuotaExceededError);

    expect(put).not.toHaveBeenCalled();
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    expect(user?.storageUsedBytes).toBe(FREE_STORAGE_LIMIT_BYTES - 500);
  });

  it("rejects files larger than plan max without calling put", async () => {
    const { db } = await setupUser("clerk_large");
    const put = vi.fn();
    const storage = {
      put,
      get: async () => null,
      delete: async () => {},
      signedUrl: async () => "/api/storage/download?token=x",
    };

    const oversized = new Uint8Array(FREE_MAX_UPLOAD_BYTES + 1);
    await expect(
      createDraftDocument(db, storage, {
        clerkUserId: "clerk_large",
        email: null,
        name: "huge.bin",
        declaredMime: "application/octet-stream",
        bytes: oversized,
      }),
    ).rejects.toBeInstanceOf(UploadTooLargeError);

    expect(put).not.toHaveBeenCalled();
  });

  it("allows only one of two concurrent reservations over quota", async () => {
    const { db, userId } = await setupUser("clerk_race");
    const storage = createMemoryStorage();

    await db
      .update(users)
      .set({
        storageUsedBytes: FREE_STORAGE_LIMIT_BYTES - 800,
      })
      .where(eq(users.id, userId));

    const chunk = new TextEncoder().encode("x".repeat(500));
    const results = await Promise.allSettled([
      createDraftDocument(db, storage, {
        clerkUserId: "clerk_race",
        email: null,
        name: "a.txt",
        declaredMime: "text/plain",
        bytes: chunk,
      }),
      createDraftDocument(db, storage, {
        clerkUserId: "clerk_race",
        email: null,
        name: "b.txt",
        declaredMime: "text/plain",
        bytes: chunk,
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    expect(user?.storageUsedBytes).toBe(FREE_STORAGE_LIMIT_BYTES - 800 + 500);
  });

  it("rolls back quota when put fails", async () => {
    const { db, userId } = await setupUser("clerk_put_fail");
    const storage = {
      put: vi.fn().mockRejectedValue(new Error("disk full")),
      get: async () => null,
      delete: async () => {},
      signedUrl: async () => "/api/storage/download?token=x",
    };

    await expect(
      createDraftDocument(db, storage, {
        clerkUserId: "clerk_put_fail",
        email: null,
        name: "f.png",
        declaredMime: "image/png",
        bytes: PNG_HEADER,
      }),
    ).rejects.toThrow("storage_failed");

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    expect(user?.storageUsedBytes).toBe(0);

    const docs = await db
      .select()
      .from(documents)
      .where(eq(documents.userId, userId));
    expect(docs.every((d) => d.deletedAt !== null)).toBe(true);
  });
});
