# Issue #10 — SaaS billing: Free plan and quotas (no charges)

Status: plan only. Do not implement in the same commit as this document.

Issue: https://github.com/caeher/stellar-data-integrity/issues/10

Depends on: #3 (plans, subscriptions, usage events), #4 (`reserveStorage` / `releaseStorage`), #7 (monthly anchor quota). All of that is on `main`.

Blocks: #9, which should render progress from `loadUsageSummary` and branch on `QUOTA_STORAGE` / `QUOTA_ANCHORS`.

This is the first issue to implement in the #9–#12 batch.

## Decision

Free limits already exist and must stay numeric. This issue closes the gaps around public error codes, one usage read model, and an explicit billing flag. It does not take payment.

Do not add the `stripe` package, Checkout, Customer Portal, webhooks, or a cron. Do not create a Vercel project.

The quota gate stays inside the existing transactions (`reserveStorage`, `reserveAnchor`). Do not add a Next.js middleware that re-checks bytes or anchor counts. `proxy.ts` remains an auth gate only.

## Limits already enforced

Constants in `db/constants.ts` (binary units, do not change):

| Plan | Storage | Max file | Anchors / UTC month |
| --- | --- | --- | --- |
| Free | `104_857_600` (100 MiB) | `26_214_400` (25 MiB) | 10 |
| Pro | 10 GiB | 100 MiB | 500 |
| Enterprise | 1 TiB | 500 MiB | 100_000 |

`db/seed.ts` upserts those three rows on `plans.slug`. `price_per_extra_anchor_cents` and `price_per_gb_cents` are `null`. Leave them `null`. Do not show Pro or Enterprise as something the user can buy.

Upload path (`lib/uploads/create-document.ts` → `db/quota.ts`):

- Per-file: `UploadTooLargeError` → HTTP `413` `{ "error": "file_too_large", "maxBytes" }`. Keep this code. It is not the storage-pool quota.
- Pool: `QuotaExceededError` when `storage_used_bytes + size > storage_limit_bytes` under `SELECT … FOR UPDATE`. HTTP `409`. Today the JSON `error` is `quota_exceeded`.
- The route also returns `file_too_large` when the body exceeds 30 MB (`MAX_BODY_BYTES` / `proxyClientMaxBodySize`). That is the transport cap. Leave it as `file_too_large`.

Anchor path (`db/anchor-quota.ts`, `POST /api/documents/:id/anchor`):

- Included count is `plans.monthly_anchors_included` for the user's plan.
- Window is `[startOfUtcMonth, startOfNextUtcMonth)`.
- Used = `usage_events` of type `anchor` in that window, plus documents still `pending`.
- A failed anchor does not insert the usage event.
- HTTP `409`. Today the JSON `error` is `anchor_quota_exceeded`.

`subscriptions.current_period_end` is set once at provision and is not the quota window. Do not roll it, and do not add a cron to reset counters. The month boundary is computed at read time from `usage_events.created_at`. That satisfies "contadores mensuales con reset" without a scheduler.

`app/dashboard/page.tsx` still prints `FREE_MONTHLY_ANCHORS` instead of the plan column. Fix that in this issue so the number cannot drift from the database.

## Public error codes

Change only the JSON `error` string the client sees. Keep HTTP statuses and the extra fields.

| Situation | Status | New `error` | Keep |
| --- | --- | --- | --- |
| Storage pool exceeded | 409 | `QUOTA_STORAGE` | `limitBytes`, `usedBytes` |
| Monthly anchors exceeded | 409 | `QUOTA_ANCHORS` | `included`, `used` |
| File larger than plan max, or body above 30 MB | 413 | `file_too_large` | `maxBytes` |

Internal class names and the job union may keep `quota_exceeded` and `anchor_quota_exceeded`. The route mappers translate them. Do not rename the state machine in `lib/anchors/job.ts` unless a call site compares the public string.

Put the public literals in `lib/api/quota-codes.ts` with no database imports, so client components can import them:

```ts
export const QUOTA_STORAGE = "QUOTA_STORAGE";
export const QUOTA_ANCHORS = "QUOTA_ANCHORS";
```

`lib/api/document-errors.ts` returns `QUOTA_STORAGE` for `QuotaExceededError`.

`app/api/documents/[id]/anchor/route.ts` returns `QUOTA_ANCHORS` where it now returns `anchor_quota_exceeded`.

Update the two UI comparisons in the same PR so a 409 is not shown as a generic failure:

- `app/dashboard/upload-form.tsx` checks `QUOTA_STORAGE`.
- `app/dashboard/document-anchor-panel.tsx` checks `QUOTA_ANCHORS`.

Copy can stay in Spanish. Prefer "Superas el espacio de tu plan." and "Has usado los anclajes incluidos este mes." Do not mention Stripe.

## Usage summary

`resolveAppUser` (`lib/auth/resolve-app-user.ts`) already returns `storageUsedBytes`, `storageLimitBytes`, `maxUploadBytes`, `planSlug`, and `planName`. It does not return `monthlyAnchorsIncluded`.

Add `monthlyAnchorsIncluded` to `AppUserRow` and to the select in `fetchAppUser`.

Add `lib/billing/usage.ts`:

```ts
export type UsageSummary = {
  planSlug: string;
  planName: string;
  storageUsedBytes: number;
  storageLimitBytes: number;
  maxUploadBytes: number;
  anchorsIncluded: number;
  anchorsSettled: number;
  anchorsPending: number;
};

export async function loadUsageSummary(
  db: AuthDb,
  userId: string,
  now?: Date,
): Promise<UsageSummary>;
```

- `anchorsSettled` is `countSuccessfulAnchorsThisMonth` (usage events in the UTC month). Do not pass `Date.now()` from a React render in a way that changes a cache key; this is a server function called per request, and the existing helper already defaults `now` to `new Date()`. Passing `now` keeps tests deterministic.
- `anchorsPending` is a new read-only count of that user's documents with `status = 'pending'` and `deletedAt is null`. Do not reuse the reservation transaction. A pending document is not also an `anchor` usage event until it settles, so the two counts are not double-added.
- `anchorsIncluded` comes from the plan row, not from `FREE_MONTHLY_ANCHORS`.

`app/dashboard/page.tsx` (until #9 replaces the paragraph with cards) must print settled and included from `loadUsageSummary`. Remove the `FREE_MONTHLY_ANCHORS` import from that page.

#9 owns progress bars, the billing screen, and the disabled upgrade buttons. This issue does not build those screens. It only fixes the existing sentence so the data is honest.

## `BILLING_ENABLED`

`lib/billing/flags.ts`:

```ts
export function isBillingEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.BILLING_ENABLED?.trim() === "true";
}
```

Unset, empty, and `"false"` are off. Only the exact string `"true"` is on.

`.env.example` (commented, default off):

```
# Payments are not implemented. Leave false. A true value does not enable Stripe.
BILLING_ENABLED=false
```

No code path may import `stripe` or redirect to Checkout when the flag is true. The flag is a gate for a later issue. #9 reads it and still renders disabled buttons.

`pnpm build` and `pnpm test` must pass with the variable unset.

## Child issue (document only in this PR)

Do not write Stripe code here. When implementing #10, open a GitHub issue that is a sub-issue of #10 (or, if sub-issues are unavailable, a normal issue whose body links #10). Title and body:

```markdown
# [Follow-up] Stripe: cobro por anclaje extra y por almacenamiento

Parent: #10

## Fuera de esta issue
No implementar Checkout, Customer Portal, ni webhooks de Stripe hasta que el plan Free y los códigos `QUOTA_STORAGE` / `QUOTA_ANCHORS` estén en `main`.

## Cuando se active
- Respetar `BILLING_ENABLED=true` como interruptor. Con `false`, ningún endpoint crea una sesión de pago.
- Stripe Checkout y Customer Portal. El paquete `stripe` solo en un route handler o server action, nunca en el cliente con la clave secreta.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, y los price ids van en el entorno. No commitearlos. No usar el prefijo `NEXT_PUBLIC_` en secretos.
- Webhook propio, distinto de `/api/webhooks/clerk`. Idempotencia con una tabla o con `webhook_events` si el esquema se extiende a propósito.
- Rellenar `plans.price_per_extra_anchor_cents` y `plans.price_per_gb_cents` en ese cambio, no antes.
- `subscriptions.stripe_customer_id` ya existe y está vacío. Usarlo ahí.
- El cupo incluido del mes UTC no cambia: los anclajes de pago son los que superan `monthly_anchors_included`. No cobrar dentro del cupo Free.
- `pnpm build` y `pnpm test` siguen en verde sin claves de Stripe.
```

This plans PR does not open that issue. The #10 implementation PR does.

## Files

```
lib/api/quota-codes.ts
lib/api/document-errors.ts                 # QUOTA_STORAGE
lib/api/document-errors.test.ts
app/api/documents/[id]/anchor/route.ts     # QUOTA_ANCHORS
app/dashboard/upload-form.tsx              # compare QUOTA_STORAGE
app/dashboard/document-anchor-panel.tsx    # compare QUOTA_ANCHORS
lib/auth/resolve-app-user.ts               # monthlyAnchorsIncluded
lib/billing/flags.ts
lib/billing/flags.test.ts
lib/billing/usage.ts
lib/billing/usage.test.ts
app/dashboard/page.tsx                     # stop hardcoding FREE_MONTHLY_ANCHORS
.env.example
README.md                                  # one line: BILLING_ENABLED=false, no Stripe
```

No Drizzle migration. No new table. No change to `db/constants.ts` or seed prices.

## Tests

PGlite, no network, no Stripe:

- `documentErrorResponse(new QuotaExceededError(...))` → status 409 and `error: "QUOTA_STORAGE"`, with `limitBytes` and `usedBytes`.
- A pure mapper used by the anchor route (extract a few lines if the route cannot be imported without Clerk) returns `QUOTA_ANCHORS` for the internal `anchor_quota_exceeded` result. Existing `db/anchor-quota.test.ts` stays about reservation, not the HTTP string.
- `isBillingEnabled`: unset, `""`, `"false"`, `" true "` → false. `"true"` → true.
- `loadUsageSummary`: seeded Free plan, one settled `anchor` usage event this month, one `pending` document → `anchorsIncluded === 10`, `anchorsSettled === 1`, `anchorsPending === 1`. A usage event from the previous UTC month is not counted. Pass `now` into the helper.

Do not point tests at a live Postgres. Do not call Friendbot or Alchemy.

## CI without keys

| Command | Stripe | Clerk | DATABASE_URL |
| --- | --- | --- | --- |
| `pnpm build` | not installed | unset | unset |
| `pnpm test` | not installed | unset | unset |
| `pnpm lint` / `pnpm typecheck` | not installed | unset | unset |

`package.json` must not gain a `stripe` dependency. Grep the diff for `stripe` before opening the implementation PR; the only hits allowed are the word in this plan, the README sentence, and `.env.example` comments.

## Acceptance

- [ ] Upload over the storage pool returns `409` and `{ "error": "QUOTA_STORAGE" }`.
- [ ] Anchor over the monthly included count returns `409` and `{ "error": "QUOTA_ANCHORS" }`.
- [ ] Per-file and 30 MB body rejections stay `file_too_large`.
- [ ] `plans` seed still has Free, Pro, and Enterprise; prices stay null.
- [ ] `BILLING_ENABLED` defaults off and is documented in `.env.example`.
- [ ] No Stripe SDK, no Checkout route, no charge.
- [ ] The follow-up issue text above is filed as a child (or linked) issue during implementation, not in the plans PR.
- [ ] `pnpm test` and `pnpm build` pass with secrets unset.

## Out of scope

- Dashboard cards, progress bars, and the disabled upgrade screen (#9).
- Changing Free byte or anchor numbers.
- A monthly cron or edits to `current_period_end`.
- Selling Pro or Enterprise.
- Metered invoices, tax, or coupons.
