import { describe, expect, it } from "vitest";

import {
  decodeAnchorRecord,
  encodeAnchorRecordScVal,
  hashToScVal,
} from "@/lib/stellar/scval";

describe("scval", () => {
  it("round-trips anchor record", () => {
    const record = {
      owner: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
      metaCid: "doc:abc",
      ledger: 100,
      timestamp: 1_700_000_000,
    };
    const val = encodeAnchorRecordScVal(record);
    expect(decodeAnchorRecord(val)).toEqual(record);
  });

  it("hashToScVal encodes 32-byte digest", () => {
    const hex =
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
    const val = hashToScVal(hex);
    expect(val.type).toBe("scvBytes");
  });
});
