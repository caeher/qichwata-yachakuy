#!/usr/bin/env tsx
/**
 * Generates a Stellar testnet keypair and funds it via friendbot.
 * Prints STELLAR_HOT_WALLET_SECRET for .env.local (never commit secrets).
 */
import { Keypair } from "@stellar/stellar-sdk";

async function main() {
  const keypair = Keypair.random();
  const publicKey = keypair.publicKey();
  const secret = keypair.secret();

  const response = await fetch(
    `https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`,
  );
  if (!response.ok) {
    console.error("Friendbot funding failed:", await response.text());
    process.exit(1);
  }

  console.log("Stellar testnet hot wallet created and funded.");
  console.log(`STELLAR_NETWORK=testnet`);
  console.log(`STELLAR_HOT_WALLET_SECRET=${secret}`);
  console.log(`Public key: ${publicKey}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
