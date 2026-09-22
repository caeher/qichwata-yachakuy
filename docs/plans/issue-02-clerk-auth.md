# Issue #2 — Clerk auth plan

Status: plan only. Implement after issue #3 schema (`users`, `plans`, `subscriptions`, `webhook_events`, `seedPlans`) exists. Do not call Stellar or accept uploads here (upload UI is #4). A minimal `/dashboard` that shows the signed-in email and Free plan is in scope.

Issue: https://github.com/caeher/stellar-data-integrity/issues/2

Current app: Next.js **16.3.5**, React **19.2.8**, App Router at the repo root (no `src/`), shadcn **base-nova** on Base UI (`Button` uses the `render` prop, not Radix `asChild`), `ThemeProvider` in `app/layout.tsx`, Spanish marketing page, `.env.example` has no secrets.

## Decision

`@clerk/nextjs@7.9.4`.

Peer range on that release includes `next@^16.1.0-0` (so 16.3.5 matches) and `react@~19.2.3` (so 19.2.8 matches). Node engine `>=20.9.0` matches the scaffold.

Next.js 16 renamed the request interceptor from `middleware.ts` to **`proxy.ts`** (Node.js runtime). Clerk’s helper is still `clerkMiddleware()` from `@clerk/nextjs/server`; only the filename changes. Do not add `middleware.ts`. Do not set `runtime: "edge"` (proxy rejects a runtime override).

`createRouteMatcher()` is deprecated in this SDK. Match paths with `URL.pathname` inside the `clerkMiddleware` callback.

Webhook verification uses `verifyWebhook` from `@clerk/nextjs/webhooks`. That helper reads **`CLERK_WEBHOOK_SIGNING_SECRET`**. The issue also requires the name **`CLERK_WEBHOOK_SECRET`** in `.env.example`. Support both: if only `CLERK_WEBHOOK_SECRET` is set, copy it onto `CLERK_WEBHOOK_SIGNING_SECRET` in the route before `verifyWebhook`. Document both variables with empty values. Never commit a real `whsec_`, `sk_`, or `pk_` key.

## Packages

```bash
pnpm add @clerk/nextjs@7.9.4 svix@2.5.0
```

`svix` is for tests that sign a payload. Production verification goes through `verifyWebhook` (do not reimplement HMAC). Vitest is already added in #3.

Do not run `clerk init` if it rewrites the app interactively or upgrades Next. Hand-write the files below.

## Build and test without a Clerk instance

`pnpm build`, `pnpm test`, `pnpm lint`, and `pnpm typecheck` must pass with **no** Clerk keys and no network.

Rules:

1. `app/layout.tsx` renders `ClerkProvider` only when `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is non-empty. Otherwise it renders `children` inside the existing `ThemeProvider`. `/` stays a static page.
2. `proxy.ts` calls `clerkMiddleware` only when `CLERK_SECRET_KEY` is set. When it is unset, the proxy returns `NextResponse.next()` so `next build` can load the module.
3. Do not import `getDb()` or `auth()` at module scope.
4. Dashboard and private APIs are dynamic (`await auth()` / `headers()`). They must not be prerendered in a way that requires keys. If a page calls `auth()` during `next build`, guard with the same env check and render a short Spanish setup message instead of throwing.
5. Tests call `provisionFreePlan` and the webhook `POST` function with `new Request` / `NextRequest`. They set `CLERK_WEBHOOK_SECRET` in the test to a fixture `whsec_…` generated in the test file (a base64 test secret, not a real endpoint). They use PGlite from #3, not Neon.

Local manual sign-in still needs a Clerk application. That is documented in the README and is not a CI requirement.

## Env

Append to `.env.example`. Path defaults are not secrets and may be filled in. Key lines stay empty.

```bash
# Clerk. Leave empty in CI. `pnpm build` must succeed without these.
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
# Same signing secret in both names. verifyWebhook reads CLERK_WEBHOOK_SIGNING_SECRET.
CLERK_WEBHOOK_SECRET=
CLERK_WEBHOOK_SIGNING_SECRET=

NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
```

Do not add `NEXT_PUBLIC_` to the secret or webhook variables.

## Route map

| Path                        | Auth                                     | Role                                                                                                                                                                |
| --------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                         | public                                   | Existing Spanish landing. Replace the disabled “Empezar pronto” button with a link to `/sign-up` (“Crear cuenta”) and add “Entrar” → `/sign-in`. Keep theme toggle. |
| `/sign-in/[[...sign-in]]`   | public                                   | `<SignIn />` centered in the existing visual shell (header + `max-w-5xl` + theme toggle).                                                                           |
| `/sign-up/[[...sign-up]]`   | public                                   | `<SignUp />` in the same shell.                                                                                                                                     |
| `/dashboard`                | session required                         | Spanish page: email, plan name “Gratis”, storage `storageUsedBytes / 100 MB`. Logout via `<UserButton />`.                                                          |
| `/api/webhooks/clerk`       | **public** (Svix, not a browser session) | `POST` only.                                                                                                                                                        |
| `/api/*` except the webhook | session required                         | #4 will add routes under this rule.                                                                                                                                 |

Catch-all folders are required so Clerk can serve its subpaths.

## `proxy.ts` (repo root, beside `app/`)

```ts
import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isProtected(pathname: string) {
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/"))
    return true;
  if (!pathname.startsWith("/api/")) return false;
  if (
    pathname === "/api/webhooks/clerk" ||
    pathname.startsWith("/api/webhooks/clerk/")
  ) {
    return false;
  }
  return true;
}

export default function proxy(request: NextRequest) {
  if (!process.env.CLERK_SECRET_KEY) return NextResponse.next();
  return clerkMiddleware(async (auth, req) => {
    if (isProtected(req.nextUrl.pathname)) await auth.protect();
  })(request);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
```

Confirm the default export is what this Next build expects (`proxy` as the function name if the default-export wrapper fails typecheck). Clerk’s published snippet uses `export default clerkMiddleware(...)`. Prefer that form when `CLERK_SECRET_KEY` is always present in real deploys, but keep the unset-key bypass so CI can build. If wrapping `clerkMiddleware()` so it is returned from an outer function breaks Clerk’s matcher types, split the file: call `clerkMiddleware` as the default export and read keys only inside the async callback, returning `undefined` when unset **and** the path is not protected. Protected paths with a missing key should `NextResponse.redirect` to `/sign-in` rather than throw during build. Adjust until `pnpm build` with an empty env exits 0. Do not weaken the “protected when the key **is** set” behavior.

Defense in depth: `app/dashboard/layout.tsx` also calls `const { userId } = await auth(); if (!userId) redirect("/sign-in")`. Private route handlers do the same and return 401 JSON. Proxy redirect alone is not the authorization check Next.js recommends.

`auth.protect()` sends anonymous users to the sign-in URL. Do not protect `/`, `/sign-in`, or `/sign-up`.

## Layout

`app/layout.tsx` keeps Geist, `lang="es"`, `suppressHydrationWarning`, and `ThemeProvider`. `ClerkProvider` wraps `{children}` **inside** `ThemeProvider` so the theme class still applies to Clerk’s widgets. Pass `afterSignOutUrl="/"`.

Do not wrap `<html>` with `ClerkProvider` (Clerk’s current guidance places it inside `<body>`).

Sign-in and sign-up pages are server components that render Clerk’s client components. Add a small `components/site-header.tsx` if the landing header and auth shell would otherwise duplicate. Reuse `ThemeToggle`.

## Provision Free plan

`lib/auth/provision-user.ts` exports:

```ts
provisionFreePlan(db, input: { clerkUserId: string; email: string | null }): Promise<{ userId: string }>
markUserDeleted(db, clerkUserId: string): Promise<void>
```

`provisionFreePlan` in one transaction:

1. Load plan `slug = 'free'`. Throw if seed was not applied.
2. `insert into users ... on conflict (clerk_user_id) do update set email = excluded.email` only when `deleted_at is null`. If the row exists and is soft-deleted, clear `deleted_at` and reset `plan_id` to Free (re-signup). Do not double-count `storage_used_bytes`.
3. `insert into subscriptions (user_id, plan_id, status, current_period_end) on conflict (user_id) do nothing`.
4. `current_period_end` is the first instant of next UTC month.

`markUserDeleted` sets `users.deleted_at = now()` and `subscriptions.status = 'canceled'` when a row exists. It does not hard-delete documents. Idempotent if the user is missing or already deleted (still returns success to the webhook).

Dashboard layout calls `provisionFreePlan` after `auth()` so a developer without a webhook tunnel still gets a Free row. The webhook does the same. Both paths are the upsert above.

## Webhook

`app/api/webhooks/clerk/route.ts`

```ts
export async function POST(req: NextRequest) {
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
  // idempotency + dispatch
  return new Response("OK", { status: 200 });
}
```

Security:

- Do not call `req.json()` or `req.text()` before `verifyWebhook`. The helper needs the raw body and `svix-id`, `svix-timestamp`, `svix-signature`.
- Missing or bad signature → **400**, no DB write.
- Persist `webhook_events.id = svix-id` first (`on conflict do nothing`). If the insert did not happen, return **200** immediately (duplicate delivery).
- Only then handle `user.created` and `user.deleted`. Ignore other types with 200.
- `user.created`: email is `evt.data.email_addresses.find(e => e.id === evt.data.primary_email_address_id)?.email_address ?? evt.data.email_addresses[0]?.email_address ?? null`. Then `provisionFreePlan`.
- `user.deleted`: `markUserDeleted(evt.data.id)`.
- DB failure after the event row is inserted → **500** so Clerk retries. On retry the event row already exists; that would skip the work. So insert the event row in the **same transaction** as the user mutation, or delete the event row if provisioning throws. Pick the transaction: `begin; insert webhook_events; provision; commit`. Duplicate `svix-id` rolls back and the handler returns 200 without a second user. A provisioning error rolls back the event row too, so the retry can succeed.
- No logging of the raw payload, emails in full, or secrets. Log `event type` and `svix-id` only.
- `GET` is not implemented (404).

## Logout

`<UserButton />` on the dashboard header. `ClerkProvider afterSignOutUrl="/"`. Do not hand-roll a session cookie delete. Acceptance: activating logout returns the browser to `/` and a following request to `/dashboard` redirects to `/sign-in`. That last step is a manual check when keys exist; unit tests assert `afterSignOutUrl` is passed and that `auth.protect` covers `/dashboard`.

## Dashboard copy (Spanish)

- Title: `Panel`
- Line: `Sesión de {email}`
- Line: `Plan Gratis · 0 B de 100 MB` (format bytes; read `storage_used_bytes` and the Free plan limit from the DB)
- If the DB is not configured, show `Configura DATABASE_URL y ejecuta pnpm db:migrate && pnpm db:seed` instead of throwing a stack trace.

No upload form on this page until #4.

## Landing CTA

In `app/page.tsx`, the primary control becomes a link-styled `Button` to `/sign-up` with label `Crear cuenta`. Secondary `Entrar` links to `/sign-in`. Use the Base UI `render` prop already used by `components/ui/button.tsx` (`<Button render={<Link href="/sign-up" />}>`). Do not use `asChild`.

## Tests (`lib/auth/provision-user.test.ts`, `app/api/webhooks/clerk/route.test.ts`)

PGlite + seed:

1. `provisionFreePlan` creates a user whose plan slug is `free` and one `active` subscription.
2. Calling it twice with the same `clerkUserId` keeps a single user and a single subscription.
3. `markUserDeleted` sets `deleted_at` and is safe to call twice.
4. `POST` without Svix headers returns 400 and writes no user.
5. `POST` with a body signed by `svix` `Webhook.sign` using the test secret, type `user.created`, creates the Free user.
6. Replaying the same `svix-id` does not create a second user and returns 200.
7. `user.deleted` for that id sets `deleted_at`.

Signing sketch (confirm method names against `svix@2.5.0` typings):

```ts
import { Webhook } from "svix";

const secret =
  "whsec_" +
  Buffer.from("test-secret-test-secret-test-secret").toString("base64");
const payload = JSON.stringify({
  type: "user.created",
  data: { id: "user_1", email_addresses: [], primary_email_address_id: null },
});
const wh = new Webhook(secret);
const headers = wh.sign(crypto.randomUUID(), new Date(), payload);
```

If `sign` is not on that class, use `new Webhook(secret).verify` only as the negative test and generate the signature with Svix’s documented header helper exported from the package. Do not skip the positive test.

## README

Add a short “Auth” section: keys live in `.env.local`, dashboard webhook endpoint is `/api/webhooks/clerk` subscribed to `user.created` and `user.deleted`, local tunnel is optional because the dashboard also provisions Free. State that CI does not need Clerk keys.

## Acceptance map

| Criterion                                                                                          | Where                                                                                               |
| -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `.env.example` has `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET` | `.env.example` (plus `CLERK_WEBHOOK_SIGNING_SECRET` alias)                                          |
| Authenticated user reaches dashboard                                                               | `proxy.ts`, `app/dashboard/page.tsx`                                                                |
| Anonymous user redirected to sign-in                                                               | `auth.protect()` on `/dashboard` and private `/api/*`                                               |
| Signup assigns Free                                                                                | `provisionFreePlan` from webhook and from dashboard layout; tests                                   |
| Logout                                                                                             | `UserButton`, `afterSignOutUrl="/"`                                                                 |
| Sign-in / sign-up with shadcn shell                                                                | `app/sign-in/[[...sign-in]]/page.tsx`, `app/sign-up/[[...sign-up]]/page.tsx`, header + theme toggle |

## Out of scope

Organizations, billing, Stripe customer creation, Stellar, file upload, social-provider setup in the Clerk dashboard (document that email + social are enabled in Clerk, not in code).

## Risks

- Protecting `/api/webhooks/clerk` makes every Svix delivery 401. The matcher must exclude it.
- Inserting the idempotency row before a failed provision swallows retries. Keep event insert and user write in one transaction.
- `ClerkProvider` without a publishable key throws while prerendering `/`. The conditional wrapper is mandatory for a credential-free build.
- Proxy default body limit is **10 MB** (`experimental.proxyClientMaxBodySize` in Next 16.3.5). Do not raise it in this issue; #4 sets `'30mb'` because uploads are larger than the default.
- Base UI `Button` has no `asChild`. Links go through `render`.
