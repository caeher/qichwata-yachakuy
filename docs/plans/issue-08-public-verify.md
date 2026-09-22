# Issue #8 — Public verify `/verify` and `/v/[hash]`

Status: plan only. Do not implement in the same commit as this document.

Issue: https://github.com/caeher/stellar-data-integrity/issues/8

Depends on: #4 (`sha256Hex` and the UTF-8 text rule), #5 (public-path helper, RPC factory, redact), #6 (`AnchorClient.verify`), #7 (`anchors` rows, `documents.status`, `expertTxUrl`).

This is the last issue in the chain **#5 → #6 → #7 → #8**. Do not start the route before `settleAnchor` can write a receipt the lookup reads. The pure lookup function can be unit-tested with rows inserted directly.

## Decision

- Anyone can verify without a Clerk session.
- Three inputs: file bytes, pasted text, or a 64-char SHA-256 hex. The server hashes files and text with the same `sha256Hex` as upload. A pasted hex is the digest itself, not content.
- Three public results only: `anchored`, `not_found`, `mismatch`.
- `mismatch` means the computed content hash ≠ the hash the user claimed (the hex field or the `/v/[hash]` segment). It does not mean "database and chain disagree".
- Lookup order: database first, chain second when a contract id and RPC exist. Tests and `pnpm build` omit both, and verification still works from the database.
- Do not store the uploaded file. Do not insert `usage_events` (that table requires `user_id`).
- Rate limit in memory. It is per Node process, which is enough for the "básico" criterion and adds no Redis, Upstash, or other secret.

## CI without keys

| Command      | Clerk | Alchemy | Hot wallet | Contract id | Network |
| ------------ | ----- | ------- | ---------- | ----------- | ------- |
| `pnpm build` | unset | unset   | unset      | unset       | none    |
| `pnpm test`  | unset | unset   | unset      | unset       | none    |

1. Pages `/verify` and `/v/[hash]` are server components that call `lookupAnchor`. They must not call `createStellarClients()` at module scope.
2. Chain reads go through `verifyOnChain(hash)`, which returns `{ configured: false }` when `STELLAR_CONTRACT_ID` is empty **without** constructing a `Keypair` and without calling RPC. The hot wallet is irrelevant here; verify is a simulation.
3. When the chain is not configured, a database hit is still `anchored` with `onChain: null` (unknown, not false).
4. Vitest uses PGlite plus a fake chain function. No `fetch`.
5. `/verify` and `/v/[hash]` stay outside `isProtectedPath`. `/api/verify` is added to the public API list from #5.

## Files

```
lib/auth/public-paths.ts             # allow /api/verify
lib/verify/hash-input.ts             # normalize hex, hash text, hash bytes
lib/verify/hash-input.test.ts
lib/verify/rate-limit.ts
lib/verify/rate-limit.test.ts
lib/verify/lookup.ts
lib/verify/lookup.test.ts
lib/verify/chain.ts                  # verifyOnChain; no secret
app/api/verify/route.ts              # POST
app/verify/page.tsx
app/verify/verify-form.tsx          # client form
app/v/[hash]/page.tsx
app/page.tsx                         # link Verificar
proxy.ts                             # already delegates to isProtectedPath
README.md
```

## Public paths

Extend #5's allowlist:

- `POST /api/verify` exactly
- `GET /api/verify/:hash` if you add it (optional; the page can call the lookup on the server and the form can `POST /api/verify` only). Prefer **one** POST route so rate limiting has one entry point. The `/v/[hash]` page calls `lookupAnchor` on the server, not the HTTP route, but it must use the same rate limiter with the request IP so a hot link cannot bypass the limit.

`isProtectedPath("/api/verify") === false`. `isProtectedPath("/verify") === false`. `isProtectedPath("/v/ab") === false`.

Add those three assertions to `lib/auth/public-paths.test.ts`.

When `CLERK_SECRET_KEY` is unset, the proxy already calls `NextResponse.next()` for unprotected paths. Confirm `/verify` is in that branch (it is, once it is not protected).

## Hash input

Reuse `sha256Hex` from `lib/uploads/hash.ts`. Do not reimplement SHA-256.

```ts
export type VerifyClaim = {
  sha256: string;
  claimedSha256: string | null;
};
```

| Input | Rule                                                                                                                                                                                                                                               |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| File  | Hash the raw `Uint8Array`. Any bytes are allowed. Do **not** run the #4 MIME allow-list (people verify content that was never uploaded here).                                                                                                      |
| Text  | `new TextEncoder().encode(text)`. Do not trim, do not normalize newlines. Empty string is a valid hash (the empty digest from #4) only when the user explicitly submits the text field. Reject a request that has neither file, nor text, nor hex. |
| Hex   | `/^[0-9a-fA-F]{64}$/`. Store lowercase. This **is** `sha256`. It is not hashed again.                                                                                                                                                              |

Size cap for file and text bodies: **25 MiB** (`26_214_400`), same number as `FREE_MAX_UPLOAD_BYTES`. Over the cap → **413** `{ "error": "file_too_large", "maxBytes": 26214400 }` and do not hash the rest. The verify route sets `export const runtime = "nodejs"`. The 30 MB proxy body limit from #4 already covers the multipart envelope.

`claimedSha256` is set when:

- the POST includes both content (file or text) and a `hash` field, or
- the page is `/v/[hash]` and the user also supplied content.

If `claimedSha256` is set and `sha256 !== claimedSha256` → result `mismatch` **without** a chain call. Still return both digests so the UI can show them.

If the only input is hex, `claimedSha256` is null and `sha256` is that hex. Result is `anchored` or `not_found`, never `mismatch`.

## Lookup

```ts
export type VerifyResult =
  | {
      status: "anchored";
      sha256: string;
      network: "testnet" | "mainnet";
      txHash: string | null;
      ledger: number | null;
      anchoredAt: string | null;
      contractId: string | null;
      owner: string | null;
      expertUrl: string | null;
      onChain: boolean | null;
      source: "database" | "chain" | "both";
    }
  | { status: "not_found"; sha256: string }
  | { status: "mismatch"; sha256: string; claimedSha256: string };
```

`lookupAnchor(db, chain, sha256)`:

1. Select the earliest anchor for this hash:

```ts
// documents.sha256 = hash
// documents.status = "anchored"
// documents.deleted_at is null
// inner join anchors on anchors.document_id
// order by anchors.anchored_at asc
// limit 1
```

Use `documents_sha256_idx`. Two users can store the same bytes; the public receipt is the **earliest** anchor. Do not return `name`, `storage_key`, `user_id`, or email.

2. Call `chain(sha256)`:
   - `{ configured: false }` → skip. Database hit: `source: "database"`, `onChain: null`, `owner: null` unless you have nowhere else to put owner (owner lives on chain; leave it null when the chain was not asked).
   - `{ configured: true, record: null }` and a database hit → still `status: "anchored"`, `source: "database"`, `onChain: false`. Do not switch the status to `mismatch`.
   - `{ configured: true, record }` and a database hit → `source: "both"`, `onChain: true`. Fill `owner`, and prefer the chain `ledger` / timestamp when the database ledger is null. Keep the database `txHash` (the chain record has no tx hash).
   - `{ configured: true, record }` and no database row → `status: "anchored"`, `source: "chain"`, `txHash: null`, `expertUrl: null`, `owner` and `ledger` and `anchoredAt` (ISO from the unix `timestamp`) from the record, `contractId` from env.
   - both empty → `not_found`.
3. Chain transport errors (thrown, not `record: null`) → if the database hit, return the database result and set `onChain: null`. If the database missed, **503** `{ "error": "chain_unavailable" }`. A down RPC must not look like "not anchored".

`verifyOnChain` uses #6 `createAnchorClient(...).verify`. It needs an RPC and a contract id, not a signer. Build the client with `Keypair.random()` only if the #6 factory requires a signer type even for `verify`. Prefer a verify-only function that does not take a signer, so a random key never exists. If the factory requires one, generate it inside the function, never from `STELLAR_HOT_WALLET_SECRET`, and never log it.

`expertUrl` via #7 `expertTxUrl`. Null when `txHash` is null.

Share URL, always lowercase hex: `/v/${sha256}`.

## Rate limit

```ts
export function consumeToken(input: {
  key: string;
  now: number;
  store: Map<string, { timestamps: number[] }>;
  limit: number;
  windowMs: number;
}): { ok: true } | { ok: false; retryAfterSeconds: number };
```

Production wrapper: limit **30** requests per **60_000** ms per IP. Fixed window is fine if the implementation is a sliding window of timestamps; use a sliding window so a burst on the boundary does not double.

IP: first hop of `x-forwarded-for` (split on comma, trim), else `x-real-ip`, else `"local"`. All missing-IP clients share `local`.

On failure the route returns **429** `{ "error": "rate_limited", "retryAfterSeconds" }` and `Retry-After` header.

The store is a module-level `Map` with a cap of 5_000 keys; drop the oldest key when full. Document that serverless replicas each have their own map. Do not add a database table for this.

Tests pass a fresh `Map` and a fake `now`. The 31st call in the same window returns `ok: false`. A call at `now + 60_000` succeeds again.

Apply the limiter at the start of `POST /api/verify` and at the start of the `/v/[hash]` server render (and `/verify` when it runs a lookup). A bad hex on `/v/[hash]` still consumes a token (it is still a request) but responds 400 without hitting the database.

## HTTP

### `POST /api/verify`

`multipart/form-data` with optional `file`, or JSON `{ "text"?: string, "hash"?: string }`. If `Content-Type` is JSON, read text/hash. If multipart, read `file` plus optional text field `hash`. Do not accept both a file and text in one request; if both are present, **400** `{ "error": "invalid_input" }`.

| Status | When                                                                                                 |
| ------ | ---------------------------------------------------------------------------------------------------- |
| 200    | `VerifyResult` (`anchored`, `not_found`, or `mismatch`)                                              |
| 400    | nothing to hash, bad hex, file and text together                                                     |
| 413    | over 25 MiB                                                                                          |
| 429    | rate limit                                                                                           |
| 503    | database URL missing (`database_unconfigured`) or chain down and database miss (`chain_unavailable`) |

No 401. The handler must not call `auth()`.

### Pages

`app/verify/page.tsx`: server component, `SiteHeader`, no Clerk widgets. Title `Verificar un documento`. Intro: `Comprueba si un archivo, un texto o un SHA-256 ya está anclado en Stellar. No hace falta una cuenta.`

Client `verify-form.tsx`:

- File input (no `accept` filter).
- Textarea `o pega un texto`.
- Input `o pega un SHA-256`.
- Submit `Verificar`.
- Results:
  - `anchored` → `Anclado` and the fields that are non-null: network, tx, ledger, date (locale `es`), owner (`G...`, `break-all`), Expert link, and the share URL.
  - `not_found` → `No hay un ancla para este hash.`
  - `mismatch` → `El contenido no coincide con el hash indicado.` Show both hashes.
- Button `Copiar enlace` copies `${origin}/v/${sha256}` with `navigator.clipboard.writeText`. If clipboard throws, show the URL in a read-only input instead.
- 429 → `Demasiadas comprobaciones. Espera un momento.`
- 503 `chain_unavailable` → `No se pudo consultar la cadena. Inténtalo más tarde.`

`app/v/[hash]/page.tsx`:

- Invalid hex → Spanish 400-style message inside the page (`Hash no válido`), HTTP status via `notFound()` is wrong (that is 404 and collides with "not anchored"). Return a normal page with the invalid message. Do not call `notFound()`.
- Valid hex → run lookup and render the same result block. Include a small form to upload a file **against this hash** (posts to the same page via the client form with the hash pre-filled). Matching file → `anchored` or `not_found`. Different file → `mismatch`.
- `<title>` / metadata: `Verificación ${hash.slice(0, 8)}…`.

Home page (`app/page.tsx`): add a text link `Verificar` to `/verify` next to the existing actions. Do not require sign-in.

320 px: one column, hashes `break-all`, file input not wider than the viewport.

## Tests

`hash-input.test.ts`:

- UTF-8 `abc` → `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad` (same vector as #4).
- `"a\nb"` and `"a\r\nb"` differ.
- Hex `AB` repeated to 64 chars is lowercased and is **not** hashed again (result equals the lowercase hex, not the hash of those characters).
- 63 chars rejected.
- Empty file rejected as `invalid_input` (zero bytes). A text body `""` is allowed and hashes to the empty digest `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.

`lookup.test.ts` on PGlite:

- Insert user, draft is ignored. Insert anchored document + anchor. Lookup returns `anchored`, tx hash, `source: "database"`, `onChain: null` when chain is `{ configured: false }`.
- No row and chain not configured → `not_found`.
- No row and chain returns a record → `anchored`, `source: "chain"`, `txHash: null`.
- Row exists, chain returns `record: null` → still `anchored`, `onChain: false`.
- Claimed hash differs from computed → `mismatch` and the chain fake's call count is 0.
- Soft-deleted document is `not_found`.
- Two anchors for one hash: the earlier `anchored_at` wins.
- Chain throw + database hit → database result, no throw.
- Chain throw + database miss → the route maps to 503. `lookupAnchor` throws a typed `ChainUnavailableError`.

`rate-limit.test.ts`: 30 allowed, 31st denied, allowed again after the window.

`public-paths.test.ts`: new paths unprotected; `/api/documents` still protected.

One route test: `POST` JSON `{ "hash": "<64 zeros>" }` with mocked empty db returns `not_found` and does not import Clerk auth (do not mock a user). Optional: spy that `auth` is not called by not mocking it and asserting the module under test has no `@clerk` import. A static assertion is enough: the route file must not import `@clerk/nextjs/server`.

No Playwright.

## README

- `/verify` is public.
- Share links look like `/v/<64 hex chars>`.
- Rate limit: 30 requests per minute per IP, in memory.
- Without `STELLAR_CONTRACT_ID` the page still answers from the database. `pnpm test` covers that path and does not call RPC.

## Commands the implementer runs

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

No new package. No `pnpm contract:deploy` required to merge the tests.

## Acceptance map

| Criterion                               | Where                                      |
| --------------------------------------- | ------------------------------------------ |
| Upload / text / hex                     | `verify-form.tsx` + `hash-input.ts`        |
| `anchored` \| `not_found` \| `mismatch` | `VerifyResult`                             |
| Local hash + DB and chain lookup        | `lookup.ts`                                |
| No login                                | public paths; route does not call `auth()` |
| Rate limit                              | `consumeToken`, 30/min                     |
| Shareable URL                           | `/v/[hash]`                                |

## Out of scope

Accounts on the verify page, email notifications, storing verify uploads, a global rate-limit service, PDF rendering, proving the file matches when the user only pasted a hex (that is `anchored`/`not_found` only).

## Risks

- Hashing trimmed text would disagree with #4, which hashes the raw UTF-8 body. The verify textarea must submit the string unchanged. Disable any "helpful" trim.
- Treating chain-miss + database-hit as `mismatch` marks valid local receipts as failures whenever RPC is empty or the contract id changed after a redeploy. `onChain: false` keeps the three-status contract and still tells the UI.
- Treating RPC failure as `not_found` hides an anchor. That path is a 503 when the database also misses.
- `/api/verify` left on the private side of `proxy.ts` redirects anonymous users to `/sign-in` as soon as Clerk is configured. The allowlist update is part of the acceptance check.
- The in-memory limiter does nothing across multiple server processes. Do not document it as a global control.
- Returning `documents.name` on a public route leaks filenames. The DTO omits it.
