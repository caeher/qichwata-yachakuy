const TX_HASH_HEX = /^[0-9a-fA-F]{64}$/;

export function expertTxUrl(
  network: "testnet" | "mainnet",
  txHash: string,
): string | null {
  if (!TX_HASH_HEX.test(txHash)) {
    return null;
  }
  const segment = network === "mainnet" ? "public" : "testnet";
  return `https://stellar.expert/explorer/${segment}/tx/${txHash}`;
}
