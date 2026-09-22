# Issue #14 — Security hardening

Status: plan only. Do not implement in the same commit as this document.

Issue: https://github.com/caeher/stellar-data-integrity/issues/14

Depends on: #13 merged. Use `StorageProvider` from #13. Do not add a second storage interface. If #13’s download route is missing, stop and implement #13 first; do not invent a parallel download path here.

`pnpm build` and `pnpm test` must pass with empty `S3_*`, empty `ALCHEMY_STELLAR_API_KEY`, empty `STELLAR_HOT_WALLET_SECRET`, empty `STELLAR_CONTRACT_ID`, and `STORAGE_DRIVER=local`. No network calls in Vitest. No Vault product, no Redis, no email provider, no PagerDuty.

## Already on main

| Checklist item             | Today                                                                                                                                                                                                     | This issue                                                                               |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Secrets server-only        | Only `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is public. `lib/stellar/redact.ts` scrubs the Alchemy key and `S…` Stellar secrets.                                                                              | Extend redact to the other server secrets. Lock the name list with a test. No Vault.     |
| Hot wallet minimum + alert | `STELLAR_HOT_WALLET_SECRET` is read in `getAnchorRuntimeConfig`. No balance check.                                                                                                                        | Pure balance helper + health field. No Horizon call when the secret is empty.            |
| Rate limit verify          | `POST /api/verify`: 30/min per IP, in-memory `consumeToken`.                                                                                                                                              | Keep those numbers. Add upload and anchor limits on the same helper.                     |
| Clerk session on mutations | `proxy.ts` `auth.protect()` on `/api/*` except public paths. Handlers call `sessionContext()` again. `app/api/documents/route.ts` and `text/route.ts` duplicate that helper.                              | One helper. Tests that anchor and document routes stay protected. No CSRF token library. |
| Size and MIME              | `assertAllowedUpload` in `lib/uploads/sniff.ts`. 25 MiB via `max_upload_bytes`. 413 / 415 already returned.                                                                                               | Do not rewrite sniff. Point the threat model at it.                                      |
| Audit log of anchors       | `logAnchor` writes a redacted `console.info` line. `usage_events` type `anchor` on success only.                                                                                                          | Persist the same events in `audit_events`. Keep the console line.                        |
| Retention / GDPR           | `DELETE /api/documents/:id` soft-deletes and, after #13, deletes that blob. `user.deleted` only sets `users.deleted_at` and cancels the subscription (`markUserDeletedInner`). Email and filename remain. | Erase blobs for every key of that user, redact email and filenames, keep `anchors`.      |
| Threat model               | None.                                                                                                                                                                                                     | Write `docs/security.md` from the outline below.                                         |

## Decision

- Server env is the secret store. Document that a host vault (Vercel env, Doppler, etc.) is an operator choice. Do not integrate one.
- Hot-wallet alert is a `console.warn` plus a `wallet` object on `GET /api/stellar/health`. The public key and native balance are already public on Horizon. The secret never appears. When the secret is unset, `wallet.configured` is false and nothing calls Horizon for an account.
- Rate limits stay per Node process, same as #8. Separate maps per action so verify traffic does not consume the upload budget.
- CSRF control is: cookie session, `auth.protect()`, and a second `sessionContext()` check on every mutation. Do not add a synchronizer token.
- GDPR delete removes bytes and direct identifiers in Postgres. It does not edit Stellar. Say that in the settings copy and in `docs/security.md`.

## Files

```
lib/env/secret-names.ts
lib/env/secret-names.test.ts
lib/stellar/redact.ts                 # also scrub S3, Clerk, database URL
lib/stellar/redact.test.ts
lib/stellar/wallet-balance.ts
lib/stellar/wallet-balance.test.ts
app/api/stellar/health/route.ts       # attach wallet; skip network if no secret
lib/http/rate-limit.ts                # move consumeToken + clientIp here
lib/verify/rate-limit.ts              # re-export consumeToken, or thin wrapper
lib/verify/rate-limit-shared.ts       # keep verify limits; import the moved helper
lib/http/limits.ts                    # upload + anchor + download limiters
lib/http/limits.test.ts
lib/http/rate-limited.ts              # 429 response helper
app/api/documents/route.ts            # use shared sessionContext; upload limit
app/api/documents/text/route.ts       # same
app/api/documents/[id]/anchor/route.ts
app/api/documents/[id]/download/route.ts   # from #13; add download limit
app/api/verify/route.ts               # use the shared 429 helper; do not change 30/min
db/schema.ts                          # audit_events
drizzle/0002_*.sql                    # generated, committed
lib/audit/record.ts
lib/audit/record.test.ts
lib/anchors/job.ts                    # recordAudit beside each logAnchor
lib/uploads/delete-document.ts        # audit document_delete
lib/privacy/erase-user.ts
lib/privacy/erase-user.test.ts
lib/auth/clerk-webhook.ts             # user.deleted calls erase, then blobs
app/api/webhooks/clerk/route.ts       # pass storage
app/dashboard/settings/page.tsx       # one retention sentence
docs/security.md
README.md                             # link docs/security.md
docs/architecture.md                  # pointer, not a second threat model
```

`pnpm db:generate` after the schema edit. Commit the SQL and the journal snapshot. Tests apply `./drizzle` through PGlite (`db/pglite.ts`). Do not hand-write a migration if generate succeeds.

## 1. Secrets stay on the server

`lib/env/secret-names.ts`:

```ts
export const SERVER_SECRET_ENV_NAMES = [
  "DATABASE_URL",
  "CLERK_SECRET_KEY",
  "CLERK_WEBHOOK_SECRET",
  "CLERK_WEBHOOK_SIGNING_SECRET",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "STORAGE_URL_SIGNING_SECRET",
  "ALCHEMY_STELLAR_API_KEY",
  "STELLAR_HOT_WALLET_SECRET",
] as const;
```

`secret-names.test.ts`: every name does **not** start with `NEXT_PUBLIC_`. That is the regression test. Do not scan the whole repo for the string `process.env`.

`redact(text, env)` already replaces the Alchemy key, the hot-wallet secret, and any `S` + 55-char Stellar secret. Also replace each `SERVER_SECRET_ENV_NAMES` value when it is non-empty. Skip empty strings (replacing `""` would wipe the log). Order does not matter. Add a test that a line containing a fake `S3_SECRET_ACCESS_KEY` and a fake `DATABASE_URL` comes back without either value, and that the hot-wallet case in `redact.test.ts` still passes.

Do not log `STELLAR_HOT_WALLET_SECRET`, S3 secrets, or Clerk secrets on the health or anchor paths. `getAnchorRuntimeConfig` already returns only `operatorPublicKey` (starts with `G`).

No new `NEXT_PUBLIC_` variable in this issue.

## 2. Hot wallet minimum and alert

`lib/stellar/wallet-balance.ts`. No `fetch` in this file. Callers pass `loadAccount`.

```ts
export const DEFAULT_MIN_XLM = {
  testnet: "10",
  mainnet: "20",
} as const;

export function xlmToStroops(xlm: string): bigint | null;

export function isBelowMin(balance: string, min: string): boolean;

export type WalletStatus =
  | { configured: false }
  | {
      configured: true;
      publicKey: string;
      nativeXlm: string;
      minXlm: string;
      low: boolean;
    }
  | { configured: true; error: "wallet_unreadable" };

export async function readHotWalletStatus(input: {
  secret: string | undefined;
  network: "testnet" | "mainnet";
  minXlmEnv: string | undefined;
  loadAccount: (
    publicKey: string,
  ) => Promise<{ balances: { asset_type: string; balance: string }[] }>;
}): Promise<WalletStatus>;
```

Rules:

- Trim `secret`. Missing or `""` → `{ configured: false }`. Do **not** call `loadAccount`. Do **not** call `Keypair.fromSecret`.
- `minXlm`: use `minXlmEnv` when `xlmToStroops` accepts it, otherwise `DEFAULT_MIN_XLM[network]`.
- `xlmToStroops`: optional leading digits, optional `.` and up to 7 decimal digits, no other characters. Scale to stroops (`10_000_000` per XLM) with `bigint`. More than 7 decimals, a minus sign, or an empty string → null. `isBelowMin` is strict `<`. Equal to the floor is not low. If either side is null, `isBelowMin` returns false (do not throw).
- Valid secret: `Keypair.fromSecret` from `@stellar/stellar-sdk` (already a dependency). `loadAccount(publicKey)`. Native balance is the entry with `asset_type === "native"`. Missing native entry or a thrown load → `{ configured: true, error: "wallet_unreadable" }`. The error string must not contain the secret.
- `low` is `isBelowMin(nativeXlm, minXlm)`.

`wallet-balance.test.ts` (no network):

- Empty secret does not call `loadAccount` (vi.fn assertion).
- Balance `"9.9999999"` against min `"10"` is low. `"10"` against `"10"` is not.
- `"10.00000001"` is rejected by `xlmToStroops` (8 decimals).
- `loadAccount` throwing with a valid-looking secret returns `wallet_unreadable` and the result JSON does not contain the secret.
- Invalid `minXlmEnv` falls back to `"10"` on testnet.

Health route (`app/api/stellar/health/route.ts`):

After a successful `readHealth`, attach `wallet`. Build `loadAccount` from the existing Horizon client (`server.loadAccount(publicKey)`) **only when** `STELLAR_HOT_WALLET_SECRET` is non-empty. When it is empty, set `{ configured: false }` and do not call `loadAccount`.

If `readHotWalletStatus` returns `low: true`, `console.warn` a single line passed through `redact`:

```json
{
  "msg": "hot_wallet_low_balance",
  "publicKey": "G…",
  "nativeXlm": "…",
  "minXlm": "…",
  "network": "testnet"
}
```

Never include the secret. A wallet error does **not** change the HTTP status of a healthy RPC. The body stays 200 with `ok: true` and `wallet.error`.

Existing `app/api/stellar/health/route.test.ts` mocks `readHealth` and asserts the body does not contain `secret-key`. Keep that. With the secret unset in the test env, `wallet` is `{ configured: false }`. Do not add a live Horizon test.

`.env.example`:

```bash
# Native XLM floor for the hot-wallet alert. Empty uses 10 (testnet) or 20 (mainnet).
# Empty is valid. CI does not call Horizon for this.
STELLAR_HOT_WALLET_MIN_XLM=
```

This is the alert. Do not send email or Slack.

## 3. Rate limits

`consumeToken` and `clientIp` live in `lib/verify/rate-limit.ts` today. Move them to `lib/http/rate-limit.ts` and re-export from the old path so existing verify tests keep working. Behavior of `consumeToken` stays (including the 5_000-key cap).

`lib/http/limits.ts` — each function has its **own** module-level `Map`. Do not share the verify map.

| Function                          | Routes                                               | Key           | Limit | Window |
| --------------------------------- | ---------------------------------------------------- | ------------- | ----- | ------ |
| `checkVerifyRateLimit` (existing) | `POST /api/verify`                                   | client IP     | 30    | 60s    |
| `checkUploadRateLimit`            | `POST /api/documents` and `POST /api/documents/text` | Clerk user id | 10    | 60s    |
| `checkAnchorRateLimit`            | `POST /api/documents/:id/anchor`                     | Clerk user id | 5     | 60s    |
| `checkDownloadRateLimit`          | `GET /api/documents/:id/download`                    | Clerk user id | 30    | 60s    |

Upload file and upload text **share** `checkUploadRateLimit`.

Apply the check immediately after `sessionContext()` returns a user, and **before** `req.formData()` / `req.json()` on the upload routes (so a flood does not buffer 30 MB bodies). On anchor, after the session check and before `getAnchorRuntimeConfig()`. On download, after the session check and before the DB read.

`lib/http/rate-limited.ts`:

```ts
export function rateLimitedResponse(retryAfterSeconds: number): Response;
```

**429** `{ "error": "rate_limited", "retryAfterSeconds": <n> }` and header `Retry-After`. Switch `app/api/verify/route.ts` to this helper. Same JSON as today.

`limits.test.ts`: 10 upload calls succeed, the 11th fails; an anchor call with the same user id still succeeds (separate map). Reuse the style of `lib/verify/rate-limit.test.ts` (pass `now`, do not sleep).

Do not add Upstash, Redis, or a gateway. `docs/security.md` states the limit is per process and resets on restart.

## 4. Clerk session on mutations

Mutations in this app:

| Method | Path                          | Session                                                  |
| ------ | ----------------------------- | -------------------------------------------------------- |
| POST   | `/api/documents`              | yes                                                      |
| POST   | `/api/documents/text`         | yes                                                      |
| DELETE | `/api/documents/:id`          | yes                                                      |
| POST   | `/api/documents/:id/anchor`   | yes                                                      |
| GET    | `/api/documents/:id/download` | yes (mint). The token URL from #13 is public on purpose. |
| POST   | `/api/webhooks/clerk`         | no; Svix signature                                       |
| POST   | `/api/verify`                 | no; public by #8                                         |
| GET    | `/api/stellar/health`         | no; public by #5                                         |

Replace the local `sessionContext` copies in `app/api/documents/route.ts` and `app/api/documents/text/route.ts` with `import { sessionContext } from "@/lib/api/session"`. Behavior stays: no `CLERK_SECRET_KEY` or no `auth()` user → **401** `{ "error": "unauthorized" }`.

Do not read a user id from the JSON body. The only identity is the Clerk session, then `resolveAppUser`.

`lib/auth/public-paths.test.ts` add:

- `/api/documents/00000000-0000-4000-8000-000000000000/anchor` is protected
- `/api/documents/00000000-0000-4000-8000-000000000000` is protected
- `/api/documents/00000000-0000-4000-8000-000000000000/download` is protected
- `/api/storage/download` stays public (#13)

No CSRF package. Document in `docs/security.md`: mutations require the Clerk cookie; `proxy.ts` calls `auth.protect()`; handlers call `sessionContext()` again; Clerk cookies are HttpOnly. A custom CSRF token is not added.

## 5. Size and MIME

No code change required if `assertAllowedUpload` and `UploadTooLargeError` still run inside `createDraftDocument` before `storage.put`.

Confirm, and write into `docs/security.md` (do not re-specify the byte table; link the code):

- Cap is the plan `max_upload_bytes` (Free: `26_214_400` in `db/constants.ts`). Over the cap → 413 `file_too_large`.
- Allow-list and executable deny list → 415 `unsupported_type` or `forbidden_file` (`lib/uploads/sniff.ts`).
- Extension alone is not enough; magic bytes are required.
- Proxy body cap stays `experimental.proxyClientMaxBodySize: "30mb"` in `next.config.ts`.

Do not add ClamAV. Do not loosen the allow-list.

## 6. Audit log for anchors

New table `audit_events` in `db/schema.ts`:

```ts
export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id),
    action: text("action").notNull(),
    documentId: uuid("document_id"),
    meta: jsonb("meta").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "audit_events_action_check",
      sql`${table.action} in (
        'anchor_submit',
        'anchor_settled',
        'anchor_failed',
        'anchor_quota',
        'anchor_reconcile_missing_tx',
        'document_delete',
        'account_erasure'
      )`,
    ),
    index("audit_events_user_id_created_at_idx").on(
      table.userId,
      table.createdAt,
    ),
  ],
);
```

`documentId` is **not** a foreign key (the audit row must survive even if a document row were removed). `userId` is nullable so a future system event can omit it; anchor events always set it.

`lib/audit/record.ts`:

```ts
export async function recordAudit(
  db: AuthDb,
  input: {
    userId: string | null;
    action:
      | "anchor_submit"
      | "anchor_settled"
      | "anchor_failed"
      | "anchor_quota"
      | "anchor_reconcile_missing_tx"
      | "document_delete"
      | "account_erasure";
    documentId?: string | null;
    meta?: Record<string, string | number | null>;
  },
): Promise<void>;
```

`meta` may contain only `sha256`, `txHash`, `network`, `included`, `used`. Drop any other key. Never store `storageKey`, email, file bytes, secrets, or signed URLs.

In `lib/anchors/job.ts`, after each existing `logAnchor(...)`, `await recordAudit(db, …)` with the same event name and the ids already in that call. Keep `logAnchor` (console). Do not make `logAnchor` touch the database.

`deleteDocumentForUser`: after a successful soft-delete, `recordAudit` action `document_delete` with `userId`, `documentId`, and no meta.

`lib/anchors/job.test.ts`: the existing “anchors via submit success” case also expects one `anchor_submit` row and one `anchor_settled` row for that document. Do not assert on `console`.

`record.test.ts`: a meta object that includes `storageKey` and `email` is stored without those keys.

## 7. Retention / GDPR delete

On-chain anchors are immutable. Postgres and the blob store are not.

`lib/privacy/erase-user.ts`:

```ts
export async function eraseUserAccount(
  db: AuthDb,
  storage: StorageProvider,
  clerkUserId: string,
): Promise<void>;
```

Steps:

1. Load the user by `clerkUserId`, including rows that already have `deleted_at`. If none, return.
2. In one transaction:
   - Set `users.deleted_at` if it is null (same as `markUserDeletedInner`).
   - Set `users.email` to null.
   - Set `subscriptions.status` to `canceled` for that user.
   - For every `documents` row of that user with `deleted_at` null, call the same quota release as `releaseStorage` (soft-delete + `storage_used_bytes`). Do not call `releaseStorage` on rows that are already soft-deleted (it no-ops, but do not depend on double-calling).
   - Set `documents.name` to `deleted` on **all** of that user’s documents.
   - `recordAudit` once: action `account_erasure`, `userId`, meta `{}`.
3. **After** the transaction commits, `storage.delete(storageKey)` for every document of that user whose key passes `keyBelongsToUser(key, user.id)`. A delete error is logged (`storage_delete_failed`, key + message) and does not throw out of the function. The webhook can still return 200 so Clerk does not retry forever **after** the DB erasure succeeded; blob delete is idempotent, so a retry is still safe (see below).
4. Do not delete `anchors` rows. Do not delete `audit_events`. Do not clear `documents.sha256` (it is the integrity record, not a direct identifier). Do not put the filename into the audit row before redacting it.

`erase-user.test.ts` on PGlite + `createMemoryStorage()`:

- User A has an active document and a second document already soft-deleted, both with blobs and keys `${userId}/…`. User B has a blob.
- Also insert an `anchors` row for A’s active document.
- After `eraseUserAccount`: A’s email is null, `deleted_at` is set, both of A’s blobs are null from `get`, both names are `deleted`, `storage_used_bytes` is 0, the anchor row is still there, B’s blob is still there, one `account_erasure` audit row exists.
- Calling it again does not throw and does not add a second audit row (check for an existing `account_erasure` for that `userId` before insert).

Webhook (`lib/auth/clerk-webhook.ts`):

Today a replayed Svix id hits `onConflictDoNothing` and returns without doing the work. That would skip a blob retry. Change **only** `user.deleted`:

- Still insert the webhook event (idempotent).
- Always call `eraseUserAccount` even when the Svix id was already stored.
- `user.created` keeps the current skip-on-replay behavior.

`handleClerkWebhook(db, req, storage)` gains a third argument. Default it to `createObjectStorage()` so the HTTP route can omit it. The route in `app/api/webhooks/clerk/route.ts` passes `createObjectStorage()`. The existing webhook test does not need a blob; pass `createMemoryStorage()` from the new test, or rely on the default only when the user has zero documents.

Extend `app/api/webhooks/clerk/route.test.ts` “marks user deleted”: after `user.deleted`, `email` is null. Add one document before the delete event and assert the blob is gone when the test passes a memory storage.

Do not add a second “delete account” button. Account deletion is the Clerk account delete, which sends `user.deleted`.

`app/dashboard/settings/page.tsx`, under the existing “La cuenta la gestiona Clerk.” line:

```text
Si eliminas la cuenta en Clerk, borramos el archivo y tus datos de perfil. El anclaje en Stellar, si existe, no se puede borrar.
```

Keep it one paragraph, Spanish, `text-muted-foreground`.

## 8. `docs/security.md`

Write this file in Spanish, short, no marketing. Use the following outline and fill it with the concrete controls above. Do not claim a third-party audit, a pentest, or that the product is legally binding.

```markdown
# Modelo de amenazas

## Activos

- El archivo (blob) y su SHA-256.
- La semilla del hot wallet (`STELLAR_HOT_WALLET_SECRET`).
- Claves de Clerk, de R2/S3 y `DATABASE_URL`.
- La fila `anchors` y el registro on-chain (hash, `doc:<uuid>`, ledger, tx).

## Límites de confianza

- El navegador no firma transacciones y no ve secretos de servidor.
- `/verify` y `/api/verify` son públicos. No revelan el archivo ni el nombre.
- `GET /api/storage/download` es público y solo vale con el token HMAC de vida corta (#13). La URL de R2 es una URL firmada de vida corta.
- El webhook de Clerk es público y solo vale con la firma Svix.

## Amenazas y controles

| Amenaza                             | Control                                                                                                                                               |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Secreto en el cliente               | Variables sin `NEXT_PUBLIC_` salvo la publishable key de Clerk. `redact()` en logs.                                                                   |
| Robo del hot wallet                 | Secret solo en el servidor. Alerta si el XLM nativo baja del mínimo (`GET /api/stellar/health`, `console.warn`). No hay Friendbot en el proceso Next. |
| Abuso de upload, anclaje o verify   | Límites en memoria por proceso (tabla de #14). 429 `rate_limited`.                                                                                    |
| CSRF sobre mutaciones               | Sesión Clerk en `proxy.ts` y otra vez en el handler. No hay token CSRF propio.                                                                        |
| Archivo peligroso o enorme          | `lib/uploads/sniff.ts` y `max_upload_bytes`.                                                                                                          |
| Borrar el documento de otro usuario | `userId` de la sesión, no del body. `keyBelongsToUser` antes de borrar o firmar.                                                                      |
| Anclaje no atribuible               | Tabla `audit_events`.                                                                                                                                 |
| Derecho de supresión                | Blob borrado, email y nombre redactados, fila en soft-delete. `anchors` y la cadena se conservan.                                                     |

## Lo que no protegemos

- Un hash ya anclado en Stellar no se puede retirar. El UUID del documento viaja en `meta` (`doc:<uuid>`). No viaja el email ni el nombre del archivo.
- El límite de tasa es por proceso. Varias instancias no comparten contador.
- No hay antivirus. La lista de tipos es un filtro, no un sandbox.
- Un token de descarga local es un bearer token durante su TTL. Por eso el TTL es corto y la respuesta lleva `no-store` y `no-referrer`.

## Operación

- CI no tiene secretos reales. `STORAGE_DRIVER=local`.
- Producción con disco efímero: `STORAGE_DRIVER=s3` (R2). Ver `.env.example`.
- Rotar `STELLAR_HOT_WALLET_SECRET` implica dejar de firmar con la semilla anterior. Los anclajes ya hechos siguen siendo válidos.
```

Link this file from the README (one bullet under the docs list) and one sentence in `docs/architecture.md`. Do not duplicate the whole model there.

## CI

Do not add secrets to `.github/workflows/ci.yml`. Optional new env vars (`STELLAR_HOT_WALLET_MIN_XLM`, `STORAGE_SIGNED_URL_TTL_SECONDS`, `STORAGE_URL_SIGNING_SECRET`) stay unset. Empty must be valid.

`pnpm test` uses PGlite, memory storage, and fake `loadAccount` / fake `AnchorClient`. No `fetch` to Horizon, Alchemy, or R2.

## Acceptance map

| Criterion                          | Where                                                             |
| ---------------------------------- | ----------------------------------------------------------------- |
| Secrets server-only                | `SERVER_SECRET_ENV_NAMES` test + `redact`                         |
| Hot wallet floor + alert           | `readHotWalletStatus`; health `wallet`; `console.warn` when `low` |
| Rate limits upload, anchor, verify | `lib/http/limits.ts`; verify unchanged at 30/min/IP               |
| Clerk session on mutations         | shared `sessionContext`; `public-paths` tests                     |
| Size and MIME                      | existing sniff; documented, not rewritten                         |
| Audit log of anchors               | `audit_events` written from `runAnchorJob`                        |
| GDPR delete                        | `eraseUserAccount` + Clerk `user.deleted`; anchors kept           |
| Threat model                       | `docs/security.md`                                                |

## Out of scope

Stripe, Vault SDK, Redis rate limits, email/Slack alerts, Friendbot, ClamAV, a custom CSRF cookie, WAF rules, deleting or rewriting Soroban ledger entries, admin UI for `audit_events`, presigned uploads.

## Risks

- Running `storage.delete` inside the webhook DB transaction holds the connection while R2 is slow. Delete blobs after commit.
- Treating a replayed `user.deleted` as a no-op skips blob cleanup if the first attempt died after the Svix insert. Always re-enter `eraseUserAccount` for that event type.
- Putting the wallet secret into the health JSON “for debugging” fails the issue. Only `publicKey`, string amounts, `low`, and `wallet_unreadable`.
- `Keypair.fromSecret` on an empty string throws. The empty check must run first, including in CI where the health route is imported.
- Sharing one rate-limit map across verify and upload lets anonymous verify traffic block signed-in uploads. Use separate maps.
- Redacting `documents.sha256` would break public verify for that user. Leave the hash. Redact name and email only.
