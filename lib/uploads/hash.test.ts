import { describe, expect, it } from "vitest";

import { sha256Hex } from "@/lib/uploads/hash";

describe("sha256Hex", () => {
  it("matches known vectors", () => {
    expect(sha256Hex(new Uint8Array())).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
    expect(sha256Hex(new TextEncoder().encode("abc"))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("is stable for the same bytes", () => {
    const bytes = new TextEncoder().encode("hola");
    expect(sha256Hex(bytes)).toBe(sha256Hex(bytes));
  });

  it("differs when bytes differ", () => {
    const a = new TextEncoder().encode("a\nb");
    const b = new TextEncoder().encode("a\r\nb");
    expect(sha256Hex(a)).not.toBe(sha256Hex(b));
  });
});
