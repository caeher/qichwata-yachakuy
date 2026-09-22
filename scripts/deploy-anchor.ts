/**
 * Deploys a new anchor contract instance (re-run = new CONTRACT_ID, not an upgrade).
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { Keypair } from "@stellar/stellar-sdk";

import { resolveStellarEndpoints } from "@/lib/stellar/endpoints";

const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";
const wasmPath =
  "contracts/anchor/target/wasm32v1-none/release/anchor.wasm";

function main() {
  const confirmMainnet = process.argv.includes("--confirm-mainnet");
  const network = process.env.STELLAR_NETWORK?.trim() || "testnet";
  if (network === "mainnet" && !confirmMainnet) {
    console.error("Refusing mainnet deploy without --confirm-mainnet");
    process.exit(1);
  }
  if (network !== "testnet" && network !== "mainnet") {
    console.error("Invalid STELLAR_NETWORK");
    process.exit(1);
  }

  const secret = process.env.STELLAR_HOT_WALLET_SECRET?.trim();
  if (!secret) {
    console.error("STELLAR_HOT_WALLET_SECRET is required");
    process.exit(1);
  }

  const keypair = Keypair.fromSecret(secret);
  const endpoints = resolveStellarEndpoints(process.env);
  const rpcUrl = endpoints.rpcUrl;
  if (!rpcUrl) {
    console.error("No Soroban RPC URL configured");
    process.exit(1);
  }

  execSync(
    `stellar contract build --manifest-path contracts/anchor/Cargo.toml`,
    { stdio: "inherit" },
  );

  const wasm = resolve(process.cwd(), wasmPath);
  if (!existsSync(wasm)) {
    console.error(`WASM not found at ${wasmPath}`);
    process.exit(1);
  }

  const passphrase =
    network === "mainnet"
      ? "Public Global Stellar Network ; September 2015"
      : TESTNET_PASSPHRASE;

  const operator = keypair.publicKey();
  const cmd = [
    "stellar contract deploy",
    `--wasm ${wasm}`,
    `--source-account ${secret}`,
    `--network-passphrase "${passphrase}"`,
    `--rpc-url ${rpcUrl}`,
    "--",
    `--operator ${operator}`,
  ].join(" ");

  const output = execSync(cmd, { encoding: "utf8" });
  const match = output.match(/C[A-Z0-9]{55}/);
  if (!match) {
    console.error("Could not parse contract id from deploy output");
    process.exit(1);
  }
  console.log(`STELLAR_CONTRACT_ID=${match[0]}`);
}

main();
