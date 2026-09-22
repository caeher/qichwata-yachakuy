# Issue #5 — Stellar RPC (Alchemy testnet + official fallbacks)

Status: plan only. Do not implement in the same commit as this document.

Issue: https://github.com/caeher/stellar-data-integrity/issues/5

Depends on: `main` after #1–#4 (`7a60817`). Next **16.3.5**, pnpm, App Router at the repo root, `proxy.ts` treats every `/api/*` path as private except `/api/webhooks/clerk`.

Blocks: #6 deploy script and typed client, #7 anchor submission, #8 on-chain lookup.

## Decision

- One server-only factory builds a Soroban RPC client and a Horizon client from env. Nothing in this module runs at import time.
- Prefer Alchemy when `ALCHEMY_STELLAR_API_KEY` is set. Same key works for testnet and mainnet; the host selects the network.
- If the key is missing, or the Alchemy call throws, fall back to the public testnet RPC and to public Horizon. Mainnet has no SDF public Soroban RPC, so a mainnet health check without a key uses Horizon only.
- The health route is public. It returns the network passphrase and the latest ledger sequence. It never returns the API key, the secret seed, or a URL that contains the key.
- `pnpm build` and `pnpm test` must pass with `ALCHEMY_STELLAR_API_KEY` unset and with no network access.

## Packages

```bash
pnpm add @stellar/stellar-sdk@17.1.0
```

Pin **17.1.0** (npm `latest` as of 2026-09-14). Do not float `latest`.

Imports used later (do not pull a second SDK):

```ts
import { Horizon, Networks, rpc } from "@stellar/stellar-sdk";
```

`rpc.Server`, `rpc.Server#getNetwork`, `rpc.Server#getLatestLedger`, and `Horizon.Server` are the only calls this issue needs. WebSocket (`wss://stellar-testnet.g.alchemy.com/v2/...`) is documented in `.env.example` and not opened.

No `server-only` package. Keep the SDK out of client components by file boundary, not by a new dependency.

## CI without Alchemy or a hot wallet

| Command           | Alchemy key | Hot wallet | Network                          |
| ----------------- | ----------- | ---------- | -------------------------------- |
| `pnpm build`      | unset       | unset      | none                             |
| `pnpm test`       | unset       | unset      | none                             |
| `pnpm dev` health | optional    | unset      | only when the route is requested |

Rules that keep those commands green:

1. Do not construct `rpc.Server` or `Horizon.Server` at module scope. `createStellarClients()` is called from the route handler.
2. Do not throw on a missing key inside the module body. A missing key selects the public fallback.
3. Vitest calls `readHealth()` with an injected `StellarProbe`. It does not call `fetch`.
4. Add `@stellar/stellar-sdk` to `serverExternalPackages` so Next does not webpack the SDK during `pnpm build`.
5. `export const runtime = "nodejs"` on the health route. The SDK is not Edge-safe.
6. Do not prefix any Stellar variable with `NEXT_PUBLIC_`.

`next.config.ts` becomes:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@stellar/stellar-sdk"],
  experimental: {
    proxyClientMaxBodySize: "30mb",
  },
};

export default nextConfig;
```

Leave the 30 MB proxy limit from #4 in place.

## Files

```
lib/stellar/endpoints.ts                 # pure URL + passphrase resolution
lib/stellar/endpoints.test.ts
lib/stellar/redact.ts                    # strip secrets from log strings
lib/stellar/redact.test.ts
lib/stellar/health.ts                    # readHealth(probe, expectedPassphrase)
lib/stellar/health.test.ts
lib/stellar/client.ts                    # createStellarClients(); imports the SDK
lib/stellar/client.test.ts               # import does not throw when env is empty
lib/auth/public-paths.ts                 # isProtectedPath(); proxy.ts delegates here
lib/auth/public-paths.test.ts
app/api/stellar/health/route.ts
proxy.ts                                 # use isProtectedPath
next.config.ts
.env.example
README.md
```

`lib/stellar/endpoints.ts` must not import `@stellar/stellar-sdk`. Tests of URL shape stay fast and do not load the SDK. `lib/stellar/client.ts` is the only file in this issue that imports the SDK.

## Endpoint resolution

```ts
export type StellarNetwork = "testnet" | "mainnet";

export type StellarEndpoints = {
  network: StellarNetwork;
  expectedPassphrase: string;
  rpcUrl: string | null;
  horizonUrl: string;
  provider: "alchemy" | "public-rpc" | "horizon";
  fallbackRpcUrl: string | null;
};
```

`resolveStellarEndpoints(env)`:

| `STELLAR_NETWORK`  | `ALCHEMY_STELLAR_API_KEY` | `rpcUrl`                                          | `provider`   | `fallbackRpcUrl`                      | `horizonUrl`                          |
| ------------------ | ------------------------- | ------------------------------------------------- | ------------ | ------------------------------------- | ------------------------------------- |
| unset or `testnet` | set                       | `https://stellar-testnet.g.alchemy.com/v2/${key}` | `alchemy`    | `https://soroban-testnet.stellar.org` | `https://horizon-testnet.stellar.org` |
| unset or `testnet` | empty                     | `https://soroban-testnet.stellar.org`             | `public-rpc` | `null`                                | `https://horizon-testnet.stellar.org` |
| `mainnet`          | set                       | `https://stellar-mainnet.g.alchemy.com/v2/${key}` | `alchemy`    | `null`                                | `https://horizon.stellar.org`         |
| `mainnet`          | empty                     | `null`                                            | `horizon`    | `null`                                | `https://horizon.stellar.org`         |
| any other string   | any                       | throw `Error("invalid_network")`                  |              |                                       |                                       |

Trim the key. Treat `""` and whitespace as unset. Never log `env` and never return the key as its own field.

Passphrases (also `Networks.TESTNET` / `Networks.PUBLIC` in the SDK; the pure module hardcodes the same strings so it does not import the SDK):

- testnet: `Test SDF Network ; September 2015`
- mainnet: `Public Global Stellar Network ; September 2015`

Alchemy hosts (do not invent a different path):

- https://www.alchemy.com/docs/reference/stellar-api-quickstart
- Testnet RPC: `https://stellar-testnet.g.alchemy.com/v2/{API_KEY}`
- Mainnet RPC: `https://stellar-mainnet.g.alchemy.com/v2/{API_KEY}`
- Named JSON-RPC params, not positional arrays. The SDK already speaks that dialect. Do not hand-roll `fetch` for `getNetwork` except inside unit-test fakes.

## Client factory

```ts
export type StellarClients = {
  endpoints: StellarEndpoints;
  rpc: rpc.Server | null;
  horizon: Horizon.Server;
};

export function createStellarClients(
  env: NodeJS.ProcessEnv = process.env,
): StellarClients;
```

- `new rpc.Server(url)` only when `rpcUrl` is non-null.
- `new Horizon.Server(horizonUrl)`.
- `allowHttp` stays false. Tests do not point this factory at `http://localhost`.
- This function does not call the network. Health does.

## Health

`GET /api/stellar/health`

Public. Add the path to the allowlist (below). No Clerk session.

```ts
export type StellarProbe = {
  getNetwork: () => Promise<{ passphrase: string }>;
  getLatestLedger: () => Promise<{ sequence: number }>;
};

export type HorizonProbe = {
  passphrase: () => Promise<string>;
  latestLedger: () => Promise<number>;
};

export async function readHealth(input: {
  endpoints: StellarEndpoints;
  primary: StellarProbe | null;
  fallback: StellarProbe | null;
  horizon: HorizonProbe;
}): Promise<HealthBody>;
```

Order:

1. If `primary` exists, call `getNetwork` then `getLatestLedger`.
2. If the passphrase is not `expectedPassphrase`, fail with `network_mismatch`. Do not try the fallback after a mismatch (the key is on the wrong network).
3. If step 1 throws and `fallback` exists and its URL differs from the primary, repeat step 1 on the fallback. Provider in the body becomes `public-rpc`.
4. If RPC is still unavailable, call Horizon. Provider becomes `horizon`. Horizon's passphrase must still match `expectedPassphrase`.
5. If every probe throws, the route returns **503** `{ "error": "stellar_unreachable" }`.

Success body:

```json
{
  "ok": true,
  "network": "testnet",
  "passphrase": "Test SDF Network ; September 2015",
  "latestLedger": 123456,
  "provider": "alchemy"
}
```

`provider` is `"alchemy"` | `"public-rpc"` | `"horizon"`.

Error bodies:

| Status | Body                                 | When                                     |
| ------ | ------------------------------------ | ---------------------------------------- |
| 400    | `{ "error": "invalid_network" }`     | `STELLAR_NETWORK` is not testnet/mainnet |
| 502    | `{ "error": "network_mismatch" }`    | RPC or Horizon passphrase ≠ expected     |
| 503    | `{ "error": "stellar_unreachable" }` | every probe threw                        |

Do not include `passphrase` from the remote on mismatch (it can be logged server-side after `redact()`). The HTTP body stays the small error code so a mis-pointed key is not echoed with extra RPC metadata.

Wire the real probes in the route:

- RPC probe: `rpc.getNetwork()` and `rpc.getLatestLedger()`. Use `sequence` as `latestLedger`.
- Horizon probe: `(await horizon.ledgers().order("desc").limit(1).call()).records[0].sequence`, and passphrase from `await horizon.root()` (`network_passphrase`). If the installed SDK names the root field differently, read the field that the type defines as the network passphrase. Do not guess a second HTTP client.

On Alchemy failure the route logs one JSON line and retries the public RPC. Log shape:

```json
{
  "msg": "stellar_rpc_fallback",
  "network": "testnet",
  "from": "alchemy",
  "to": "public-rpc"
}
```

Run the message through `redact(line, env)` before `console.warn`. `redact` replaces every occurrence of `ALCHEMY_STELLAR_API_KEY` and of any `S` + 55-character StrKey secret (`/^S[A-Z2-7]{55}$/` on tokens) with `[redacted]`. It does not log the replacement source.

## Public paths

`proxy.ts` currently inlines `isProtected`. Move that predicate to `lib/auth/public-paths.ts` and call it from the proxy so #8 can extend the allowlist without rewriting Clerk wiring.

A path is protected when:

- it is `/dashboard` or starts with `/dashboard/`
- or it starts with `/api/` and is not public

Public API paths after this issue:

- `/api/webhooks/clerk` and `/api/webhooks/clerk/*`
- `/api/stellar/health` exactly (no extra suffix)

`/verify` and `/v/*` are already public because they are not under `/dashboard` or `/api`. Do not protect them.

When `CLERK_SECRET_KEY` is unset, the proxy already skips Clerk and still redirects protected paths to `/sign-in`. Health must not redirect. The empty-key branch uses the same `isProtectedPath`.

## Env

Append to `.env.example`:

```bash
# Stellar. Server-only. Never prefix these with NEXT_PUBLIC_.
# `pnpm build` and `pnpm test` succeed when the key and the secret are empty.
# STELLAR_NETWORK: testnet (default) or mainnet.
STELLAR_NETWORK=testnet

# Alchemy Free app, chain Stellar. Testnet host is
# https://stellar-testnet.g.alchemy.com/v2/<key>
# Mainnet host is https://stellar-mainnet.g.alchemy.com/v2/<key>
# Websocket (not used by the app): wss://stellar-testnet.g.alchemy.com/v2/<key>
# Empty key → testnet uses https://soroban-testnet.stellar.org
# and Horizon https://horizon-testnet.stellar.org.
# Empty key on mainnet → Horizon https://horizon.stellar.org only
# (no official public mainnet Soroban RPC).
ALCHEMY_STELLAR_API_KEY=

# Hot wallet and contract id are consumed by #6/#7. Leave empty here.
# STELLAR_HOT_WALLET_SECRET=
# STELLAR_CONTRACT_ID=
```

Do not put a real key in the example. Do not commit `.env.local`.

## README

Add a section **Stellar (Alchemy Free)**:

1. Create a free account at https://dashboard.alchemy.com/.
2. Create an app. Chain: **Stellar**. Network: **Testnet**.
3. Copy the API key into `ALCHEMY_STELLAR_API_KEY` in `.env.local`. Do not use a `NEXT_PUBLIC_` name. Do not paste the key into client components or issues.
4. Set `STELLAR_NETWORK=testnet`.
5. `pnpm dev`, then `GET http://localhost:3000/api/stellar/health`. A green body has `ok: true`, passphrase `Test SDF Network ; September 2015`, and a numeric `latestLedger`.
6. With the key empty, the same route uses `https://soroban-testnet.stellar.org` and reports `provider: "public-rpc"`.

State that `pnpm build` and `pnpm test` do not need the key.

Update the Free-plan sentence that says anchoring is not implemented: it stays unimplemented until #7. This issue only adds RPC.

## Tests

`endpoints.test.ts` (no SDK, no network):

- Empty env → testnet, public RPC URL, provider `public-rpc`, horizon testnet, fallback RPC null.
- Key `abc` + default network → URL `https://stellar-testnet.g.alchemy.com/v2/abc`, provider `alchemy`, fallback `https://soroban-testnet.stellar.org`.
- The returned object has no property whose value is the raw key except as a substring of `rpcUrl`. A helper `publicEndpointView(endpoints)` used by logs omits `rpcUrl` when provider is `alchemy`. Assert the view has no `abc`.
- `mainnet` + empty key → `rpcUrl: null`, provider `horizon`, horizon `https://horizon.stellar.org`.
- `mainnet` + key → alchemy mainnet host.
- `STELLAR_NETWORK=futurenet` throws `invalid_network`.
- Key `"  "` is treated as empty.

`health.test.ts`:

- Primary probe resolves → body uses primary passphrase and sequence, provider `alchemy`.
- Primary throws, fallback resolves → provider `public-rpc` and fallback sequence.
- Primary returns a different passphrase → rejects `network_mismatch` and does not call fallback (`vi.fn` call count 0).
- Primary and fallback throw, horizon resolves → provider `horizon`.
- All throw → the route test (below) maps to 503. `readHealth` throws a typed `StellarUnreachableError`.

`redact.test.ts`:

- A string containing the alchemy key and an `S` + 55 char secret becomes `[redacted]` for both, surrounding JSON keys intact.

`client.test.ts`:

- `await import("@/lib/stellar/client")` with empty `process.env` does not throw.
- `createStellarClients({})` does not return a Promise and does not throw.
- Do not assert on private SDK fields. Assert `rpc` is non-null for testnet with an empty key (public URL) and `endpoints.provider === "public-rpc"`.

`public-paths.test.ts`:

- `/api/stellar/health` is not protected.
- `/api/documents` is protected.
- `/api/webhooks/clerk` is not protected.
- `/dashboard` is protected.
- `/` and `/verify` are not protected.

Route test, one file `app/api/stellar/health/route.test.ts`: mock `createStellarClients` and the probe methods with `vi.mock`. Assert 200 JSON and that `JSON.stringify(body)` does not contain `secret-key`. Do not boot Next.

No Playwright.

## Commands the implementer runs

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

`pnpm build` with no `.env.local`. Optional manual check: `pnpm dev` and curl the health route when a key or the public testnet is reachable. Do not add that curl to `pnpm test`.

## Acceptance map

| Criterion                                     | Where                                                                |
| --------------------------------------------- | -------------------------------------------------------------------- |
| Factory from `STELLAR_NETWORK` + Alchemy key  | `lib/stellar/endpoints.ts`                                           |
| Fallback public Soroban RPC + Horizon         | table above; health probe order                                      |
| `@stellar/stellar-sdk`                        | `package.json` pin 17.1.0                                            |
| `GET /api/stellar/health` passphrase + ledger | `app/api/stellar/health/route.ts`                                    |
| Key never sent to the client                  | no `NEXT_PUBLIC_` name; health JSON omits URL when it embeds the key |
| `.env.example` + README Alchemy Free          | sections above                                                       |

## Out of scope

Submitting transactions, Friendbot, the Soroban contract, hot-wallet signing, WebSocket subscriptions, mainnet deploy, rate limiting (that is #8).

## Risks

- Importing `@stellar/stellar-sdk` from `upload-form.tsx` or any `"use client"` file puts a Node HTTP client in the browser bundle and can inline a key if someone builds the URL there. The form file stays UI-only.
- A top-level `new rpc.Server(...)` runs during `next build` page data collection if a server component calls it at import. Only the route handler may call `createStellarClients()`, and only after the request arrives.
- Alchemy's URL embeds the key. Logging `endpoints.rpcUrl` leaks it. Log `provider` and `network` only, after `redact`.
- Treating a passphrase mismatch as a signal to fall back would hide a testnet key pointed at mainnet. Mismatch is terminal.
- Mainnet without a key cannot satisfy "latest ledger via Soroban RPC". Horizon is the documented fallback. Do not invent `https://soroban-mainnet.stellar.org`.
- `proxy.ts` must learn the health path. Leaving it protected makes the acceptance check redirect to `/sign-in` whenever Clerk is configured.
