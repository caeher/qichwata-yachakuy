# Issue #7 — Anchor job + receipt

Status: plan only. Do not implement in the same commit as this document.

Issue: https://github.com/caeher/stellar-data-integrity/issues/7

Depends on: #4 (draft documents, server SHA-256, dashboard upload card), #5 (RPC factory, redact, health), #6 (`AnchorClient`, `STELLAR_CONTRACT_ID`, operator-auth contract).

Blocks: #8 public lookup (needs `anchors` rows and `documents.status = 'anchored'`).

## Decision

- The user anchors an existing **draft** document. The server signs with the hot wallet. The browser never sees the seed and never builds the transaction.
- Quota is the plan's `monthly_anchors_included` (Free = **10** per UTC month from `db/constants.ts`). There is no credit balance column. A successful anchor inserts one `usage_events` row of type `anchor`. Remaining = included − (successful anchors this month + other in-flight `pending` documents). A failure does not insert the usage event, so it does not consume the month.
- The job is the HTTP request plus a short poll, not a queue worker. A retry of the same document reuses the in-flight tx hash or the on-chain record. It does not write a second anchor for the same hash.
- `pnpm build` and `pnpm test` pass with `STELLAR_HOT_WALLET_SECRET`, `ALCHEMY_STELLAR_API_KEY`, and `STELLAR_CONTRACT_ID` all unset. Tests inject a fake `AnchorClient` and use PGlite.

## CI without keys

Same rules as #5, plus:

1. `createAnchorService()` reads the secret and contract id **inside the function**, and only when a real submission is requested. Importing `lib/anchors/service.ts` must not throw.
2. Vitest never calls `createAnchorService()`. It calls `runAnchorJob(db, fakeChain, input)`.
3. The route returns **503** `{ "error": "anchor_unconfigured" }` when the secret or `STELLAR_CONTRACT_ID` is missing, and it does this **before** flipping the document to `pending`.
4. Do not call Friendbot from the Next process.
5. `serverExternalPackages` already includes `@stellar/stellar-sdk` from #5. Keep the anchor route on `runtime = "nodejs"`.

## Schema migration

`documents.status` check today is `draft | anchored | failed`. Add `pending`.

Add nullable `documents.pending_tx_hash` (`text`). This holds the hash returned by `sendTransaction` before the receipt row exists. `anchors.tx_hash` stays **not null** and unique, and is inserted only after success.

`db/schema.ts` status check becomes:

```sql
status in ('draft', 'pending', 'anchored', 'failed')
```

Drizzle column: `pendingTxHash: text("pending_tx_hash")`.

```bash
pnpm db:generate
```

Commit `drizzle/0001_*.sql` and `drizzle/meta/*`. If drizzle-kit asks about a rename, it is an **alter** of the check constraint plus a new column, not a renamed table. `pnpm db:generate` does not need `DATABASE_URL` (same dummy URL rule as #3).

`createTestDb()` already applies the whole `drizzle/` folder. Extend `db/schema.test.ts` with one assertion that a document can be inserted with `status: "pending"` and `pendingTxHash: null`. Do not point tests at a live Postgres.

No new table. The receipt is the existing `anchors` row.

## Files

```
db/schema.ts
drizzle/0001_*.sql
drizzle/meta/*
db/anchor-quota.ts                  # reserve / settle / fail, FOR UPDATE
db/anchor-quota.test.ts
lib/anchors/types.ts
lib/anchors/job.ts                   # runAnchorJob
lib/anchors/job.test.ts
lib/anchors/service.ts               # reads env, builds AnchorClient (#6)
lib/anchors/expert-url.ts
lib/anchors/fee.ts                   # stroops string → 7-decimal numeric string
lib/anchors/fee.test.ts
lib/anchors/log.ts                   # JSON logs via redact() from #5
app/api/documents/[id]/route.ts      # GET detail
app/api/documents/[id]/anchor/route.ts
app/dashboard/upload-form.tsx        # enable anchor, poll status
app/dashboard/documents/[id]/page.tsx
lib/uploads/create-document.ts       # widen DocumentDto status
```

When editing `lib/uploads/create-document.ts`, move the inline `import("@/db/quota")` to the top of the file (workspace rule: no inline imports).

## Quota and state machine

UTC month window: `[startOfUtcMonth, startOfNextUtcMonth)`. Do **not** use `subscriptions.current_period_end` as the window. That column is set once at provision (`onConflictDoNothing`) and is not rolled forward.

`countAnchorUsage(tx, userId, now)` =

- rows in `usage_events` with `type = 'anchor'`, this user, `created_at` in the window
- plus documents of this user with `status = 'pending'` and `deleted_at is null`, excluding the document currently being anchored

Pending jobs from a previous month still count, so a stuck job cannot be bypassed by waiting for the next month.

Lock order inside one transaction: `users` row `FOR UPDATE`, then the document row `FOR UPDATE`.

`reserveAnchor(db, { userId, documentId })` returns:

| Document state                                   | Result                                                                   |
| ------------------------------------------------ | ------------------------------------------------------------------------ |
| missing, wrong user, or `deleted_at` set         | throw `not_found` / `forbidden`                                          |
| `anchored`                                       | `{ kind: "already" }` (load the `anchors` row)                           |
| `pending` and `pending_tx_hash` set              | `{ kind: "poll", txHash }`                                               |
| `pending` and hash null, updated < 2 minutes ago | `{ kind: "in_progress" }`                                                |
| `pending` and hash null, older than 2 minutes    | treat as abandoned: `{ kind: "submit" }` and keep `pending`              |
| `draft` or `failed`, count ≥ included            | throw `AnchorQuotaExceeded`                                              |
| `draft` or `failed`, count < included            | set `status = 'pending'`, `pending_tx_hash = null`, `{ kind: "submit" }` |

Do not insert `usage_events` in `reserveAnchor`.

`settleAnchor` (success transaction):

- Insert `anchors` (`network`, `tx_hash`, `ledger`, `contract_id`, `fee_xlm`, `anchored_at = now()`).
- Set document `status = 'anchored'`, `pending_tx_hash = null`.
- Insert `usage_events` `{ type: "anchor", bytesDelta: 0, meta: { documentId, txHash, sha256 } }`.
- If `tx_hash` already exists, the unique index throws. Catch it and return the existing receipt when it belongs to this document. If it belongs to another document, throw `hash_already_anchored` and do not change this document (caller resets status; see below).

`failAnchor`:

- Set `status = 'failed'`. Leave `pending_tx_hash` as the failed attempt's hash if one exists, so logs and a later poll can still see it. A later `reserveAnchor` on `failed` clears it when moving back to `pending`.
- No usage event.

`AnchorQuotaExceededError` carries `included` and `used`. Map to **409** `{ "error": "anchor_quota_exceeded", "included": 10, "used": 10 }`.

## Job

```ts
export async function runAnchorJob(
  db: AuthDb,
  chain: AnchorClient,
  input: {
    userId: string;
    documentId: string;
    network: "testnet" | "mainnet";
    contractId: string;
    operatorPublicKey: string;
  },
): Promise<AnchorJobResult>;
```

`AnchorClient` is the #6 interface (`verify` + `submitAnchor`). Tests pass a fake. `lib/anchors/service.ts` builds the real one with `createStellarClients()`, `Keypair.fromSecret(STELLAR_HOT_WALLET_SECRET)`, and `STELLAR_CONTRACT_ID`.

`meta_cid` is `doc:${documentId}`. `owner` is `operatorPublicKey`. Hash is `documents.sha256` (64 lowercase hex). Do not re-read the blob and do not re-hash unless you are fixing a bug; the stored hash is the anchor input.

Steps:

1. `reserveAnchor`.
2. `kind: "already"` → return the receipt. Do not call the chain.
3. `kind: "poll"` → `chain` is not asked to submit. The service layer polls `rpc.pollTransaction(txHash)` via a narrow `poll(txHash)` method added next to `AnchorClient` **or** the fake implements `submitAnchor` only and `poll` is a separate dependency `TxPoller`. Keep the fake small:

```ts
export type TxPoller = {
  poll(txHash: string): Promise<AnchorSubmitResult>;
};
```

The real poller calls `rpc.pollTransaction`. The job's fake poller returns `SUCCESS` or `FAILED` from the test.

4. `kind: "in_progress"` → return `{ status: "pending" }` with no second submit.
5. `kind: "submit"`:
   1. `chain.verify(sha256)`.
   2. If a record exists and `metaCid === doc:${documentId}` → the chain already has this document (crash after success). Settle using the record's ledger. `txHash` may be unknown: if we have `pending_tx_hash`, use it; if not, still settle only when we have a tx hash. If verify hits and we have **no** tx hash, set status `anchored` is wrong because `anchors.tx_hash` is not null. In that hole, return `{ status: "pending", warning: "chain_has_record" }` and log `anchor_reconcile_missing_tx`. Do not invent a tx hash. The operator re-polls once `pending_tx_hash` is known. The normal path writes `pending_tx_hash` immediately after `sendTransaction` returns, before polling, so this hole is only a crash window.
   3. If a record exists and `metaCid` is different → another document owns the hash. `fail` is the wrong word: set status back to `draft` (not `failed`), no usage event, return **409** `{ "error": "hash_already_anchored", "sha256" }`. The first on-chain record stays untouched.
   4. Otherwise `submitAnchor`. As soon as `txHash` is present, persist `pending_tx_hash` in its own short update (before poll). Then poll.
   5. `SUCCESS` → `settleAnchor`.
   6. `FAILED` or `error: "already_anchored"` → run verify once more. Same-document record: go to step 2. Different document: 409 as above. Genuine failure: `failAnchor`, **422** `{ "error": "anchor_failed" }`.
   7. `PENDING` after the poll budget → leave `pending`, **202**.

Poll budget inside the POST: **20 seconds**. #6's `pollTransaction` should be called with a timeout that fits in that budget. If the SDK poll does not take a timeout, race it with `setTimeout` 20s and then return 202.

Fee: `feeStroops` integer string → `fee_xlm` numeric string with 7 decimal places. `1 stroop = 10^-7 XLM`. Implement with `BigInt` integer division, not `Number`. Example: `"100"` stroops → `"0.0000100"`. `null` fee stays `null`.

Network column is `input.network` (`testnet` or `mainnet`), which must match `STELLAR_NETWORK`.

## HTTP

Auth is the same session helper as `app/api/documents/route.ts` (`await auth()`, resolve app user). Missing session → **401**. Missing `DATABASE_URL` → **503** `{ "error": "database_unconfigured" }` matching the upload routes' style (read the existing helper and reuse it; do not invent a second database error string if one already exists).

### `GET /api/documents/:id`

Owner only. 404 for another user's id (do not reveal existence).

```ts
type DocumentDetail = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  status: "draft" | "pending" | "anchored" | "failed";
  createdAt: string;
  anchor: null | {
    network: "testnet" | "mainnet";
    txHash: string;
    ledger: number | null;
    contractId: string | null;
    anchoredAt: string;
    feeXlm: string | null;
    expertUrl: string;
  };
};
```

No `storageKey`, no email, no clerk id.

### `POST /api/documents/:id/anchor`

No body. JSON responses:

| Status | Body                                                       | When                                    |
| ------ | ---------------------------------------------------------- | --------------------------------------- |
| 200    | `DocumentDetail` with `status: "anchored"`                 | settled or already anchored             |
| 202    | `DocumentDetail` with `status: "pending"`                  | poll budget exhausted, or `in_progress` |
| 401    | `{ "error": "unauthorized" }`                              | no session                              |
| 404    | `{ "error": "not_found" }`                                 | not this user's document                |
| 409    | `{ "error": "anchor_quota_exceeded", "included", "used" }` | Free 10/month reached                   |
| 409    | `{ "error": "hash_already_anchored", "sha256" }`           | chain record points at another doc      |
| 422    | `{ "error": "anchor_failed" }`                             | tx failed                               |
| 503    | `{ "error": "anchor_unconfigured" }`                       | secret or contract id missing           |

Widen the list DTO in `listDocumentsForUser` so `status` is the same union, not the literal `"draft"`. The dashboard list can keep using the upload response for the card; the detail page uses GET.

## Stellar Expert

```ts
export function expertTxUrl(network: "testnet" | "mainnet", txHash: string) {
  const segment = network === "mainnet" ? "public" : "testnet";
  return `https://stellar.expert/explorer/${segment}/tx/${txHash}`;
}
```

Only allow a 64-char hex `txHash`. Otherwise return `null` and omit the link.

## Logs

`logAnchor(event, fields)` writes one `console.info` / `console.error` line of JSON:

```json
{
  "msg": "anchor_settled",
  "documentId": "...",
  "network": "testnet",
  "txHash": "...",
  "ledger": 100,
  "provider": "alchemy"
}
```

Events: `anchor_submit`, `anchor_settled`, `anchor_failed`, `anchor_quota`, `anchor_reconcile_missing_tx`.

Pass the line through `redact` (#5) with `process.env`. Never log the secret, the Alchemy URL, signed XDR, or the full env object. A test spies on `console.info` and asserts a secret planted in a field is replaced.

## UI (Spanish)

Replace the disabled control in `app/dashboard/upload-form.tsx`.

| Status         | Copy                                                                                   | Control                                                              |
| -------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `draft`        | `Borrador. Aún no está anclado en Stellar.`                                            | button `Anclar en blockchain`                                        |
| `pending`      | `Anclando en Stellar…`                                                                 | button disabled                                                      |
| `anchored`     | `Anclado en Stellar.`                                                                  | link `Ver en Stellar Expert` (`target="_blank"`, `rel="noreferrer"`) |
| `failed`       | `El anclaje falló.`                                                                    | button `Reintentar anclaje`                                          |
| quota 409      | `Has usado los 10 anclajes del plan Gratis este mes.`                                  | button disabled until next month (server still enforces)             |
| hash taken 409 | `Este contenido ya está anclado en otro registro.` plus link `/v/<sha256>` `Verificar` | no retry that would resubmit                                         |
| 503            | `El anclaje no está configurado en el servidor.`                                       |                                                                      |

After POST returns `pending`, `GET /api/documents/:id` every 2 seconds, up to 15 times (30 s). Stop on `anchored` or `failed`. If still pending, show `Sigue pendiente. Puedes dejar esta página y volver al detalle.`

Detail page `app/dashboard/documents/[id]/page.tsx` (server component, same auth shell as the dashboard): name, monospace hash (`break-all`), status in Spanish, and the Expert link when `anchor` is present. The upload card links here (`Ver detalle`).

320 px: stack the hash and the button, full-width button, no horizontal scroll other than wrapping hex.

Do not add a new component library. Use the existing `Button` and `Card`. `Button` is Base UI; links use the `render` prop already used on the home page (`<Button render={<Link href="..." />}>`).

Show anchor usage on the dashboard next to storage usage when the DB is configured: `Anclajes este mes: {used} de {included}`. `used` is the successful count for the UTC month (not pending). Query in the server component, same `DATABASE_URL` guard the page already has.

## Tests

`fee.test.ts`: `"100"` → `"0.0000100"`. `"10000000"` → `"1.0000000"`. `"0"` → `"0.0000000"`.

`anchor-quota.test.ts` on PGlite + seeded Free plan + one user:

- 10 settled anchors in the current month, 11th `reserveAnchor` throws and leaves the document `draft`.
- An anchor with `created_at` last month does not count. Insert it by setting `created_at` explicitly.
- A `pending` document counts even if its `created_at` is last month.
- Two `Promise.all` reserves of two drafts when 9 are already used: exactly one `submit`, the other throws. Same locking note as #3/#4 (PGlite is one connection; interleave with a deferred lock if `Promise.all` cannot overlap).
- `settleAnchor` writes one `anchors` row, one `usage_events` type `anchor`, status `anchored`, `pending_tx_hash` null.
- Second `settleAnchor` with the same tx hash does not create a second usage event.
- `failAnchor` leaves usage count unchanged and status `failed`.

`job.test.ts`:

- Fake chain `verify → null`, `submit → SUCCESS` with a fixed tx hash and ledger. Document ends `anchored`, usage +1, Expert URL contains `/testnet/tx/`.
- Fake `submit` that only resolves after recording the hash: assert `pending_tx_hash` was written (spy on a `onSubmitted` callback the job invokes before poll, so the test does not depend on timing).
- `verify` returns `{ metaCid: "doc:other" }` → document returned to `draft`, usage unchanged, result `hash_already_anchored`.
- `verify` returns this document's meta → no `submit` call, settle once.
- Quota error does not call `verify` or `submit`.
- `FAILED` → status `failed`, no usage row.

Route test with `vi.mock("@clerk/nextjs/server")`: 401 when `userId` is null. One test is enough.

No Playwright. No real RPC.

## README

- Anchoring needs `STELLAR_HOT_WALLET_SECRET` (starts with `S`, server only) and `STELLAR_CONTRACT_ID` from `pnpm contract:deploy`.
- Free plan: 10 anchors per UTC month. Failed attempts are not counted. Pending attempts hold a slot.
- `pnpm test` uses a fake chain and does not need those variables.

Append the secret name to `.env.example` if #5 left it commented, as a real empty assignment:

```bash
STELLAR_HOT_WALLET_SECRET=
STELLAR_CONTRACT_ID=
```

## Commands the implementer runs

```bash
pnpm db:generate
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Do not run `pnpm db:migrate` in CI. Do not call the anchor route against testnet from Vitest.

## Acceptance map

| Criterion                                     | Where                                                        |
| --------------------------------------------- | ------------------------------------------------------------ |
| User anchors a draft                          | `POST /api/documents/:id/anchor`                             |
| Free 10/month block                           | `reserveAnchor` + 409 copy                                   |
| Hot wallet server-only                        | `service.ts` reads the secret; client bundle does not        |
| Alchemy RPC                                   | real service uses `createStellarClients()` from #5           |
| Persist `anchors`, mark document, usage event | `settleAnchor`                                               |
| UI pending → anchored / failed                | upload card + detail page                                    |
| Stellar Expert link                           | `expertTxUrl`                                                |
| Idempotent retry                              | reserve kinds `already` / `poll`; chain verify before submit |
| Structured logs without secrets               | `logAnchor` + `redact`                                       |

## Out of scope

Email receipts, mainnet guardrails beyond refusing to sign when `STELLAR_NETWORK` is unset (default testnet), Stripe overage, a background queue, changing the hash algorithm.

## Risks

- Inserting the usage event before the tx succeeds charges the user for a failure. Settle only on success.
- Two clicks: without `FOR UPDATE`, both can pass the count of 9 and submit two transactions. The contract then rejects the second hash, but both might still have been signed. The lock plus the `pending` state is the guard.
- `anchors.tx_hash` unique means the second user cannot store the first user's receipt. Returning 409 and a verify link is intentional. Do not delete the first anchor.
- Writing `pending` and then crashing before `pending_tx_hash` is the reconcile hole described above. Keep that window to the `sendTransaction` round trip.
- Logging `Keypair` or the secret source account string leaks the seed. Log the public key (`G...`) only.
- A 20 s poll can hit a serverless timeout later. The 202 plus client poll is the escape hatch. Do not raise the server wait above 20 s.
- `fee_xlm` as a JS number will not round-trip `numeric(20,7)`. Keep a string the whole way.
