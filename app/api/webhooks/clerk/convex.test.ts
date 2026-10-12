import { NextRequest } from "next/server";
import { Webhook } from "svix";
import { afterEach, describe, expect, it, vi } from "vitest";

import { internal } from "@/convex/_generated/api";
import { handleClerkWebhook } from "@/lib/auth/clerk-webhook";

const convex = vi.hoisted(() => ({
  enabled: false,
  mutation: vi.fn(async () => true),
}));

vi.mock("@/lib/convex/server", async (importOriginal) => {
  const server = await importOriginal<typeof import("@/lib/convex/server")>();
  return {
    ...server,
    convexConfigured: () => convex.enabled,
    convexInternalMutation: convex.mutation,
  };
});

const TEST_SECRET =
  "whsec_" +
  Buffer.from("test-secret-test-secret-test-secret").toString("base64");

function signedRequest(body: object, secret = TEST_SECRET): NextRequest {
  const webhook = new Webhook(secret);
  const payload = JSON.stringify(body);
  const timestamp = new Date();
  const svixId = "msg_convex_signature";
  const signature = webhook.sign(svixId, timestamp, payload);

  return new NextRequest("http://localhost/api/webhooks/clerk", {
    method: "POST",
    body: payload,
    headers: {
      "content-type": "application/json",
      "svix-id": svixId,
      "svix-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
      "svix-signature": signature,
    },
  });
}

describe("Clerk webhook Convex dispatch", () => {
  afterEach(() => {
    convex.enabled = false;
    convex.mutation.mockClear();
    delete process.env.CLERK_WEBHOOK_SIGNING_SECRET;
    delete process.env.CLERK_WEBHOOK_SECRET;
  });

  it("validates the signature before invoking a Convex mutation", async () => {
    convex.enabled = true;
    process.env.CLERK_WEBHOOK_SIGNING_SECRET = TEST_SECRET;
    const req = signedRequest(
      {
        type: "user.created",
        data: {
          id: "user_invalid_signature",
          email_addresses: [],
          primary_email_address_id: null,
        },
      },
      "whsec_" + Buffer.from("wrong-signing-secret").toString("base64"),
    );

    const response = await handleClerkWebhook({} as never, req);

    expect(response.status).toBe(400);
    expect(convex.mutation).not.toHaveBeenCalled();
  });

  it("sends the verified event and effect data through one mutation", async () => {
    convex.enabled = true;
    process.env.CLERK_WEBHOOK_SIGNING_SECRET = TEST_SECRET;
    const req = signedRequest({
      type: "user.created",
      data: {
        id: "user_verified_event",
        email_addresses: [
          { id: "email_primary", email_address: "verified@example.com" },
        ],
        primary_email_address_id: "email_primary",
      },
    });

    const response = await handleClerkWebhook({} as never, req);

    expect(response.status).toBe(200);
    expect(convex.mutation).toHaveBeenCalledTimes(1);
    expect(convex.mutation).toHaveBeenCalledWith(
      internal.users.processWebhookEvent,
      {
        svixId: "msg_convex_signature",
        eventType: "user.created",
        clerkUserId: "user_verified_event",
        email: "verified@example.com",
      },
    );
  });
});
