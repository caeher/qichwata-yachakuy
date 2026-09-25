import type { NextRequest } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";

import type { AuthDb } from "@/lib/auth/provision-user";
import { provisionUserInner } from "@/lib/auth/provision-user";
import { webhookEvents } from "@/db/schema";
import { eraseUserAccountInner } from "@/lib/privacy/erase-user";
import { internal } from "@/convex/_generated/api";
import {
  convexConfigured,
  convexInternalMutation,
} from "@/lib/convex/server";

function primaryEmail(data: {
  email_addresses: { id: string; email_address: string }[];
  primary_email_address_id: string | null;
}): string | null {
  const primary = data.email_addresses.find(
    (e) => e.id === data.primary_email_address_id,
  );
  return (
    primary?.email_address ?? data.email_addresses[0]?.email_address ?? null
  );
}

export async function handleClerkWebhook(db: AuthDb, req: NextRequest) {
  if (
    !process.env.CLERK_WEBHOOK_SIGNING_SECRET &&
    process.env.CLERK_WEBHOOK_SECRET
  ) {
    process.env.CLERK_WEBHOOK_SIGNING_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  }

  let evt;
  try {
    evt = await verifyWebhook(req);
  } catch {
    return new Response("Invalid webhook", { status: 400 });
  }

  const svixId = req.headers.get("svix-id");
  if (!svixId) {
    return new Response("Invalid webhook", { status: 400 });
  }

  if (convexConfigured()) {
    try {
      const inserted = await convexInternalMutation(
        internal.users.recordWebhookEvent,
        { svixId, eventType: evt.type },
      );
      if (!inserted) {
        return new Response("OK", { status: 200 });
      }
      if (evt.type === "user.created") {
        const clerkUserId = evt.data.id;
        if (!clerkUserId) throw new Error("missing user id");
        await convexInternalMutation(internal.users.provisionFromWebhook, {
          clerkUserId,
          email: primaryEmail(evt.data),
        });
      } else if (evt.type === "user.deleted") {
        const clerkUserId = evt.data.id;
        if (!clerkUserId) throw new Error("missing user id");
        await convexInternalMutation(internal.users.deleteFromWebhook, {
          clerkUserId,
        });
      }
    } catch {
      return new Response("Webhook processing failed", { status: 500 });
    }
    return new Response("OK", { status: 200 });
  }

  try {
    await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(webhookEvents)
        .values({ id: svixId, eventType: evt.type })
        .onConflictDoNothing()
        .returning();

      if (inserted.length === 0) {
        return;
      }

      if (evt.type === "user.created") {
        const clerkUserId = evt.data.id;
        if (!clerkUserId) {
          throw new Error("missing user id");
        }
        await provisionUserInner(tx, {
          clerkUserId,
          email: primaryEmail(evt.data),
        });
      } else if (evt.type === "user.deleted") {
        const clerkUserId = evt.data.id;
        if (!clerkUserId) {
          throw new Error("missing user id");
        }
        await eraseUserAccountInner(tx, clerkUserId);
      }
    });
  } catch {
    return new Response("Webhook processing failed", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
