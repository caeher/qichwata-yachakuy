import { Address, xdr } from "@stellar/stellar-sdk";

import type { AnchorRecord } from "@/lib/stellar/anchor-types";

const HEX_64 = /^[0-9a-fA-F]{64}$/;

export function hashToScVal(hex: string): xdr.ScVal {
  if (!HEX_64.test(hex)) {
    throw new Error("invalid_hash");
  }
  const bytes = Buffer.from(hex, "hex");
  return xdr.ScVal.scvBytes(bytes);
}

export function metaToScVal(metaCid: string): xdr.ScVal {
  return xdr.ScVal.scvString(metaCid);
}

export function addressToScVal(address: string): xdr.ScVal {
  return Address.fromString(address).toScVal();
}

function scValToString(val: xdr.ScVal): string {
  if (val.type !== "scvString") {
    throw new Error("expected_string");
  }
  return val.value;
}

function scValToU32(val: xdr.ScVal): number {
  if (val.type !== "scvU32") {
    throw new Error("expected_u32");
  }
  return val.u32;
}

function scValToU64(val: xdr.ScVal): number {
  if (val.type !== "scvU64") {
    throw new Error("expected_u64");
  }
  const n = Number(val.u64);
  if (!Number.isSafeInteger(n)) {
    throw new Error("u64_overflow");
  }
  return n;
}

function scValToAddress(val: xdr.ScVal): string {
  return Address.fromScVal(val).toString();
}

export function encodeAnchorRecordScVal(record: AnchorRecord): xdr.ScVal {
  return xdr.ScVal.scvMap([
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("owner"),
      val: addressToScVal(record.owner),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("meta_cid"),
      val: metaToScVal(record.metaCid),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("ledger"),
      val: xdr.ScVal.scvU32(record.ledger),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("timestamp"),
      val: xdr.ScVal.scvU64(BigInt(record.timestamp)),
    }),
  ]);
}

export function decodeAnchorRecord(val: xdr.ScVal): AnchorRecord | null {
  if (val.type === "scvVoid") {
    return null;
  }
  if (val.type !== "scvMap") {
    return null;
  }
  const map = val.map ?? [];
  const fields = new Map<string, xdr.ScVal>();
  for (const entry of map) {
    const key = entry.key;
    if (key.type === "scvSymbol") {
      fields.set(key.value, entry.val);
    }
  }
  const ownerVal = fields.get("owner");
  const metaVal = fields.get("meta_cid");
  const ledgerVal = fields.get("ledger");
  const tsVal = fields.get("timestamp");
  if (!ownerVal || !metaVal || !ledgerVal || !tsVal) {
    return null;
  }
  return {
    owner: scValToAddress(ownerVal),
    metaCid: scValToString(metaVal),
    ledger: scValToU32(ledgerVal),
    timestamp: scValToU64(tsVal),
  };
}
