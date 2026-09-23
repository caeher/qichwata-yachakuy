import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { Webhook } from "svix";
import { afterEach, describe, expect, it } from "vitest";

import { createTestDb } from "@/db/pglite";
import { documents, users, webhookEvents } from "@/db/schema";
import { handleClerkWebhook } from "@/lib/auth/clerk-webhook";

const TEST_SECRET =
  "whsec_" +
  Buffer.from("test-secret-test-secret-test-secret").toString("base64");

function signedRequest(body: object, msgId = crypto.randomUUID()): NextRequest {
  const wh = new Webhook(TEST_SECRET);
  const payload = JSON.stringify(body);
  const timestamp = new Date();
  const signature = wh.sign(msgId, timestamp, payload);

  return new NextRequest("http://localhost/api/webhooks/clerk", {
    method: "POST",
    body: payload,
    headers: {
      "content-type": "application/json",
      "svix-id": msgId,
      "svix-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
      "svix-signature": signature,
    },
  });
}

describe("POST /api/webhooks/clerk (handleClerkWebhook)", () => {
  afterEach(() => {
    delete process.env.CLERK_WEBHOOK_SIGNING_SECRET;
    delete process.env.CLERK_WEBHOOK_SECRET;
  });

  it("returns 400 without Svix headers", async () => {
    const { db } = await createTestDb();
    process.env.CLERK_WEBHOOK_SIGNING_SECRET = TEST_SECRET;

    const req = new NextRequest("http://localhost/api/webhooks/clerk", {
      method: "POST",
      body: "{}",
    });
    const res = await handleClerkWebhook(db, req);
    expect(res.status).toBe(400);

    const allUsers = await db.select().from(users);
    expect(allUsers).toHaveLength(0);
  });

  it("creates an individual account without plans on user.created", async () => {
    const { db } = await createTestDb();
    process.env.CLERK_WEBHOOK_SIGNING_SECRET = TEST_SECRET;

    const req = signedRequest({
      type: "user.created",
      data: {
        id: "user_wh_1",
        email_addresses: [{ id: "em_1", email_address: "wh@example.com" }],
        primary_email_address_id: "em_1",
      },
    });

    const res = await handleClerkWebhook(db, req);
    expect(res.status).toBe(200);

    const user = await db.query.users.findFirst({
      where: eq(users.clerkUserId, "user_wh_1"),
    });
    expect(user).toBeDefined();
    expect(user?.email).toBe("wh@example.com");
  });

  it("dedupes replayed svix-id", async () => {
    const { db } = await createTestDb();
    process.env.CLERK_WEBHOOK_SIGNING_SECRET = TEST_SECRET;

    const msgId = "msg_replay_1";
    const body = {
      type: "user.created",
      data: {
        id: "user_replay",
        email_addresses: [],
        primary_email_address_id: null,
      },
    };

    const first = await handleClerkWebhook(db, signedRequest(body, msgId));
    const second = await handleClerkWebhook(db, signedRequest(body, msgId));
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    const allUsers = await db
      .select()
      .from(users)
      .where(eq(users.clerkUserId, "user_replay"));
    expect(allUsers).toHaveLength(1);

    const events = await db
      .select()
      .from(webhookEvents)
      .where(eq(webhookEvents.id, msgId));
    expect(events).toHaveLength(1);
  });

  it("marks user deleted on user.deleted", async () => {
    const { db } = await createTestDb();
    process.env.CLERK_WEBHOOK_SIGNING_SECRET = TEST_SECRET;

    await handleClerkWebhook(
      db,
      signedRequest({
        type: "user.created",
        data: {
          id: "user_del_wh",
          email_addresses: [],
          primary_email_address_id: null,
        },
      }),
    );

    const user = await db.query.users.findFirst({
      where: eq(users.clerkUserId, "user_del_wh"),
    });
    await db.insert(documents).values({
      userId: user!.id,
      name: "f.txt",
      sha256: "d".repeat(64),
      status: "draft",
    });

    const deletion = {
      type: "user.deleted",
      data: { id: "user_del_wh" },
    };
    const deletionId = "msg_user_del_wh";
    const delRes = await handleClerkWebhook(
      db,
      signedRequest(deletion, deletionId),
    );
    const replayRes = await handleClerkWebhook(
      db,
      signedRequest(deletion, deletionId),
    );
    expect(delRes.status).toBe(200);
    expect(replayRes.status).toBe(200);

    const userAfter = await db.query.users.findFirst({
      where: eq(users.clerkUserId, "user_del_wh"),
    });
    expect(userAfter?.deletedAt).not.toBeNull();
    expect(userAfter?.email).toBeNull();
    const redacted = await db.query.documents.findFirst({
      where: eq(documents.userId, user!.id),
    });
    expect(redacted?.name).toBe("deleted");
    expect(redacted?.sha256).toBe("d".repeat(64));
    const deletionEvent = await db.query.webhookEvents.findFirst({
      where: eq(webhookEvents.id, deletionId),
    });
    expect(deletionEvent).toBeDefined();
  });
});
