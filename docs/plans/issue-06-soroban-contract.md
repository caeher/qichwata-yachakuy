# Issue #6 — Soroban SHA-256 anchor contract + testnet deploy

Status: plan only. Do not implement in the same commit as this document.

Issue: https://github.com/caeher/stellar-data-integrity/issues/6

Depends on: #5 (`lib/stellar/endpoints.ts`, `createStellarClients`, public health). The Rust crate itself does not import Next or #5. The deploy script and the TS client do.

Blocks: #7 (submit `anchor`, poll, persist `anchors.contract_id`) and #8 (on-chain `verify`).

## Decision

**Ship the Soroban contract.** Do not implement the Stellar Classic memo path in this issue.

`cargo test` for this crate uses `soroban-sdk` testutils inside the process. It does not need Alchemy, a funded account, a secret key, or a network. That satisfies "tooling works without secrets". `pnpm test` (Vitest) does not invoke Cargo, so the existing Node CI stays green on machines without Rust. The implementer runs `pnpm contract:test` locally (or in a later Rust job) and that command is the contract acceptance check.

Deploy to testnet is a manual script. It is not part of `pnpm build` or `pnpm test`.

The Classic memo alternative is documented at the bottom for a future cutover only. Do not add a second code path "just in case".

## What is on chain

One persistent record per SHA-256:

| Field       | Type         | Source                                     |
| ----------- | ------------ | ------------------------------------------ |
| key         | `BytesN<32>` | the hash                                   |
| `owner`     | `Address`    | recorded owner (v1: the operator address)  |
| `meta_cid`  | `String`     | off-chain pointer, max 128 bytes           |
| `ledger`    | `u32`        | `env.ledger().sequence()` at first anchor  |
| `timestamp` | `u64`        | `env.ledger().timestamp()` at first anchor |

No file bytes, no email, no Clerk id, no storage key. `meta_cid` for this product is `doc:<document uuid>` (written by #7). The contract only checks length.

v1 has no per-user Stellar account. `__constructor` stores the operator (the hot wallet). `anchor` calls `operator.require_auth()`. The `owner` argument is stored as data. #7 passes the same hot-wallet address as `owner`. Public verify can show that address. It is not a secret. Do not put a user id in the `Address` field.

## Idempotency

| Call                                                 | Result                                                    |
| ---------------------------------------------------- | --------------------------------------------------------- |
| First `anchor(hash, meta, owner)`                    | persist, emit `ANCHOR`, return the record                 |
| Same hash, same `meta_cid`, same `owner`             | return the **original** record. No write, no second event |
| Same hash, different `meta_cid` or different `owner` | `AnchorError::AlreadyAnchored`. Storage unchanged         |

A retry must not move `ledger` or `timestamp`.

## Packages and toolchain

Rust crate, not a pnpm dependency.

```toml
# contracts/anchor/Cargo.toml
[package]
name = "anchor"
version = "0.1.0"
edition = "2021"
publish = false

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
soroban-sdk = "28.0.0"

[dev-dependencies]
soroban-sdk = { version = "28.0.0", features = ["testutils"] }

[profile.release]
opt-level = "z"
overflow-checks = true
lto = true
codegen-units = 1
```

`soroban-sdk` **28.0.0** is crates.io max stable as of 2026-09-18. Commit `contracts/anchor/Cargo.lock`.

Stellar CLI (deploy and wasm build only, not Vitest): install the **v28** line so it matches `soroban-sdk` 28. Docs: https://developers.stellar.org/docs/tools/cli/install-cli (`brew install stellar-cli`, or the GitHub Action `stellar/stellar-cli@v28.0.0`). The CLI's contract build target in current docs is `wasm32v1-none`, not `wasm32-unknown-unknown`.

```bash
rustup target add wasm32v1-none
```

Node side: reuse `@stellar/stellar-sdk@17.1.0` from #5. Do not add a second client package. Do not generate bindings by calling the network during `pnpm build`.

## CI without secrets

| Command                | Needs Rust | Needs `stellar` CLI | Needs secrets        | In `pnpm test` / `pnpm build` |
| ---------------------- | ---------- | ------------------- | -------------------- | ----------------------------- |
| `pnpm test`            | no         | no                  | no                   | yes                           |
| `pnpm build`           | no         | no                  | no                   | yes                           |
| `pnpm contract:test`   | yes        | no                  | no                   | no                            |
| `pnpm contract:build`  | yes        | yes                 | no                   | no                            |
| `pnpm contract:deploy` | yes        | yes                 | testnet secret + RPC | no                            |

`package.json` scripts:

```json
{
  "contract:test": "cargo test --manifest-path contracts/anchor/Cargo.toml",
  "contract:build": "stellar contract build --manifest-path contracts/anchor/Cargo.toml",
  "contract:deploy": "tsx scripts/deploy-anchor.ts"
}
```

If `cargo` or `stellar` is missing, those three scripts fail when called. They are not wired into `pnpm test` or `pnpm build`. Document that in the README.

The TS client is hand-written against XDR (`scvBytes`, `scvString`, `scvAddress`, `scvU32`, `scvU64`, `scvVec` / `scvMap` as the SDK version encodes the struct). A checked-in spec is unnecessary if encode/decode have unit tests that round-trip `xdr.ScVal` **without** a network. `contract.Client.from` downloads WASM from RPC; do not use it on the Next build path.

## Files

```
contracts/anchor/Cargo.toml
contracts/anchor/Cargo.lock
contracts/anchor/src/lib.rs          # contract + #[cfg(test)] module
scripts/deploy-anchor.ts
lib/stellar/anchor-types.ts          # AnchorRecord, AnchorError names
lib/stellar/scval.ts                 # hash/meta/record encode + decode
lib/stellar/scval.test.ts
lib/stellar/anchor-client.ts         # submitAnchor + verifyAnchor, takes rpc + keypair
.gitignore                           # contracts/anchor/target/
README.md
```

Do not commit `target/` or `*.wasm`. The deploy script builds, then deploys.

Add to `.gitignore`:

```
contracts/anchor/target/
```

## Contract

`#![no_std]`. Use the SDK 28 constructor form (not a separate `initialize` that anyone can race):

```rust
#[contract]
pub struct AnchorContract;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AnchorRecord {
    pub owner: Address,
    pub meta_cid: String,
    pub ledger: u32,
    pub timestamp: u64,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum AnchorError {
    AlreadyAnchored = 1,
    MetaTooLong = 2,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Anchored {
    #[topic]
    pub hash: BytesN<32>,
    pub owner: Address,
    pub meta_cid: String,
}

const META_MAX: u32 = 128;
const TTL_THRESHOLD: u32 = 17280;   // ~1 day at 5s ledgers
const TTL_EXTEND_TO: u32 = 3110400; // ~180 days
```

```rust
#[contractimpl]
impl AnchorContract {
    pub fn __constructor(env: Env, operator: Address) {
        env.storage().instance().set(&symbol_short!("op"), &operator);
        env.storage().instance().extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);
    }

    pub fn anchor(
        env: Env,
        hash: BytesN<32>,
        meta_cid: String,
        owner: Address,
    ) -> Result<AnchorRecord, AnchorError> { /* ... */ }

    pub fn verify(env: Env, hash: BytesN<32>) -> Option<AnchorRecord> { /* ... */ }
}
```

`anchor` steps:

1. Load operator from instance storage. `operator.require_auth()`.
2. If `meta_cid.len() > META_MAX`, return `MetaTooLong`. `len()` is bytes.
3. Persistent key is the hash (`BytesN<32>`), not a `String`.
4. If a record exists:
   - equal `meta_cid` and equal `owner` → return it (no event).
   - otherwise → `AlreadyAnchored`.
5. Else build `AnchorRecord` from `env.ledger()`, `persistent().set`, `persistent().extend_ttl(&hash, TTL_THRESHOLD, TTL_EXTEND_TO)`, `Anchored { hash, owner, meta_cid }.publish(&env)`, return the record.

`verify` does not `require_auth` and does not extend TTL (TTL extension is a write; verify stays a read).

Storage layout: operator in **instance** storage (one address). Records in **persistent** storage (unbounded map). Do not put the map in instance storage.

If the host rejects `TTL_EXTEND_TO` as above the network max, lower `TTL_EXTEND_TO` to the max the SDK test environment accepts and write that number in a comment. Do not leave TTL at the default (entries expire).

## Rust tests (`cargo test`)

All in `contracts/anchor/src/lib.rs` under `#[cfg(test)]`. `Env::default()`, `env.register(AnchorContract, (&operator,))`, `AnchorContractClient`.

1. `anchor_then_verify` — `mock_all_auths()`. verify returns the record. owner and meta match. ledger and timestamp are non-zero in the default env (use `env.ledger().set_sequence_number` / timestamp testutils so the values are deterministic, e.g. sequence 100 and timestamp 1_700_000_000).
2. `reanchor_same_payload_keeps_first_ledger` — anchor at sequence 100, bump sequence to 200, anchor again with the same args. verify still shows ledger 100 and timestamp from the first call. `env.events().all().len()` stays 1.
3. `reanchor_different_meta_errors` — second call with another meta returns `AlreadyAnchored` via `try_anchor`. verify still shows the first meta.
4. `reanchor_different_owner_errors` — same as 3 for a second `Address`.
5. `unauthorized` — do not call `mock_all_auths`. `try_anchor(...).is_err()`.
6. `verify_unknown_is_none`.
7. `meta_too_long` — 129-byte string returns `MetaTooLong` and verify is `None`.
8. `meta_at_max_ok` — 128 bytes succeeds.

No `stellar` CLI and no network in these tests.

## Typed TS client

`lib/stellar/anchor-types.ts`:

```ts
export type AnchorRecord = {
  owner: string;
  metaCid: string;
  ledger: number;
  timestamp: number;
};

export type AnchorSubmitResult = {
  txHash: string;
  status: "SUCCESS" | "FAILED" | "PENDING";
  ledger: number | null;
  feeStroops: string | null;
  record: AnchorRecord | null;
  error: "already_anchored" | "meta_too_long" | "rpc" | null;
};
```

`lib/stellar/scval.ts` exports:

- `hashToScVal(hex: string): xdr.ScVal` — 32 bytes, `scvBytes`. Reject hex that is not 64 lowercase or uppercase chars.
- `metaToScVal(metaCid: string): xdr.ScVal`
- `addressToScVal(address: string): xdr.ScVal`
- `decodeAnchorRecord(val: xdr.ScVal): AnchorRecord | null`

Round-trip test: build an `xdr.ScVal` with the SDK (no RPC) for a known record and decode it. Known hash hex is the `abc` vector from #4: `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad`.

`lib/stellar/anchor-client.ts` is the seam #7 calls. It must not read `process.env` at import.

```ts
export type AnchorClient = {
  verify(hashHex: string): Promise<AnchorRecord | null>;
  submitAnchor(input: {
    hashHex: string;
    metaCid: string;
    owner: string;
  }): Promise<AnchorSubmitResult>;
};

export function createAnchorClient(input: {
  rpc: rpc.Server;
  networkPassphrase: string;
  contractId: string;
  signer: Keypair;
}): AnchorClient;
```

`verify`: build a transaction that invokes `verify` with the hash ScVal, `rpc.simulateTransaction`, decode the return value. Simulation is read-only. No signature required for the read. If the contract is missing, return `null` only when the simulation says the entry is absent; RPC transport errors throw so #8 can distinguish "not found" from "RPC down".

`submitAnchor`:

1. `rpc.getAccount(signer.publicKey())`.
2. `TransactionBuilder` + `Operation.invokeContractFunction` (or the SDK helper that takes contract id, method `anchor`, and the three ScVals). Fee `BASE_FEE` (`100` stroops) as the inclusion fee; `rpc.prepareTransaction` adds the resource fee.
3. Timeout 30 seconds. Network passphrase from the argument, not from a hardcoded mainnet default.
4. `sign(signer)`.
5. `rpc.sendTransaction`.
6. `rpc.pollTransaction(hash)` (present on `rpc.Server` in this SDK line). Map `SUCCESS` / `FAILED` / still not found after the poll to the result union.
7. On success, decode the return value into `record`.
8. `feeStroops` is the string of charged stroops from the poll result. Do not convert to a JS float here. #7 writes `fee_xlm` as a numeric string.

`Keypair.fromSecret` happens inside the composition root (#7), not in this file's module scope. This file accepts an already-built `Keypair`. Unit tests pass a fake `AnchorClient` and do not need a secret. One test may build `Keypair.random()` in memory to assert `submitAnchor` calls `sign` — only if the test does not open a socket. Prefer testing ScVal in isolation and leaving send/poll to a mocked `rpc.Server` (`vi.fn`). If mocking the SDK server is brittle, skip the network mock and test only `scval.ts` plus a pure `mapPollStatus()` function. Do not hit Alchemy from Vitest.

Contract id env name in this repo is **`STELLAR_CONTRACT_ID`** (issue text says `CONTRACT_ID`). One variable. Do not also read `CONTRACT_ID`.

## Deploy script

`scripts/deploy-anchor.ts`, executed only via `pnpm contract:deploy`.

Preconditions (exit 1 with a one-line message, no secret echo):

- `STELLAR_NETWORK` is `testnet`. Refusing `mainnet` unless the argv flag `--confirm-mainnet` is present. Default implementer path is testnet without the flag.
- `STELLAR_HOT_WALLET_SECRET` is set and `Keypair.fromSecret` accepts it.
- RPC URL comes from `resolveStellarEndpoints` (#5). Testnet with an empty Alchemy key uses `https://soroban-testnet.stellar.org`.

Steps:

1. `stellar contract build --manifest-path contracts/anchor/Cargo.toml`.
2. WASM path: `contracts/anchor/target/wasm32v1-none/release/anchor.wasm`. If the CLI writes a different path, use the path it prints. Do not guess `wasm32-unknown-unknown` first.
3. If Horizon says the account is missing on testnet, `GET https://friendbot.stellar.org/?addr=<G...>` once. Never call Friendbot when network is mainnet.
4. Deploy with the CLI so the operator identity is not stored in the repo:

```bash
stellar contract deploy \
  --wasm contracts/anchor/target/wasm32v1-none/release/anchor.wasm \
  --source-account <SECRET from env, passed as an env var the CLI already documents> \
  --network-passphrase "Test SDF Network ; September 2015" \
  --rpc-url <url from resolveStellarEndpoints> \
  -- \
  --operator <G-address of the same hot wallet>
```

Use the CLI's current flag for "secret from env" (`STELLAR_ACCOUNT` / `--source` with a key in the environment). Do not write `~/.config/stellar` into the git repo. Do not print the secret. Print only:

```text
STELLAR_CONTRACT_ID=C...
```

The operator copies that into `.env.local`. The script does not edit env files.

Constructor arg `--operator` is the hot wallet's public key. That is the address `require_auth` will demand.

Idempotent deploy: deploying again creates a **new** contract id. Say that in the script header comment. Re-running is not an upgrade. Upgrades are out of scope.

## README

Short subsection under Stellar:

- Contract crate: `contracts/anchor`.
- `pnpm contract:test` runs Rust unit tests. It does not need a key. It is not part of `pnpm test`.
- `pnpm contract:deploy` deploys to testnet and prints `STELLAR_CONTRACT_ID`. Requires `STELLAR_HOT_WALLET_SECRET` and either `ALCHEMY_STELLAR_API_KEY` or the public testnet RPC.
- On chain: hash + `meta_cid` + owner address only.

## Commands the implementer runs

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm contract:test
pnpm contract:build
```

`pnpm contract:deploy` only with a testnet secret available. Do not put that secret in CI. If Rust is not installed, `pnpm test` and `pnpm build` still have to pass, and the PR description says `pnpm contract:test` was not run and why. Do not skip the Rust tests silently when Rust is installed.

## Acceptance map

| Criterion                        | Where                                                   |
| -------------------------------- | ------------------------------------------------------- |
| Compilable contract              | `pnpm contract:build` → wasm                            |
| Testnet deploy + contract id env | `scripts/deploy-anchor.ts` prints `STELLAR_CONTRACT_ID` |
| Rust unit tests                  | `pnpm contract:test` cases listed above                 |
| Typed TS client                  | `lib/stellar/anchor-client.ts`, `anchor-types.ts`       |
| Hash + pointer only              | `AnchorRecord` fields; `META_MAX` 128                   |
| Idempotent re-anchor             | Rust tests 2–4                                          |
| Operator auth                    | `__constructor` + `require_auth`; test 5                |

## Out of scope

Contract upgrades, mainnet deploy, per-user Stellar accounts, TTL keeper bot, Classic memo implementation, calling the contract from a browser wallet.

## Risks

- Persistent entries expire. `extend_ttl` on write is required. `verify` cannot bump TTL. A later keeper is out of scope; document the ~180 day window.
- `contract.Client.from(contractId)` fetches WASM at runtime and breaks tests that have no RPC. The hand-written ScVal path avoids that.
- Generating TS bindings with `--contract-id` during `pnpm build` needs a deployed contract and a network. Do not add that to `build`.
- Two deploys → two contract ids. #7 would anchor to whichever id is in env. The script must say re-deploy is a new contract.
- `require_auth` on the **owner argument** instead of the stored operator would force every end user to hold a Stellar key. v1 auths the operator only.
- Committing the hot-wallet secret into `scripts/` or `.env.example` is a release-blocking mistake. `.env.example` keeps the value empty.

## Appendix — Classic memo MVP (do not implement)

Use this only if `pnpm contract:test` cannot be made to compile in the implementer's environment. Stop and say so in the PR. Do not land both designs.

Stellar Classic `MEMO_HASH` is exactly 32 bytes, so a SHA-256 fits. A 0.0000001 XLM payment from the hot wallet to itself with that memo is an immutable receipt. Horizon can fetch the transaction by hash. There is no `verify(hash)` index: finding a memo means paging the account's operations. Idempotency is only in our database. Events, operator `require_auth`, and a stable contract id do not exist. Migrating later does not move old memos into the contract.

That is why this issue prefers Soroban: the Rust tests prove anchor/verify/idempotency with no secrets, and the deploy script is the only step that needs a key.
