import { describe, expect, it } from "vitest";

import {
  ForbiddenFileError,
  UnsupportedTypeError,
} from "@/lib/uploads/quota-error";
import { assertAllowedUpload } from "@/lib/uploads/sniff";

const PNG_HEADER = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0,
]);

describe("assertAllowedUpload", () => {
  it("accepts png and rejects mz masquerade", () => {
    expect(assertAllowedUpload(PNG_HEADER, "f.png", "image/png")).toBe(
      "image/png",
    );
    const mz = new Uint8Array([0x4d, 0x5a, 0, 0]);
    expect(() => assertAllowedUpload(mz, "f.png", "image/png")).toThrow(
      ForbiddenFileError,
    );
  });

  it("validates pdf by magic bytes", () => {
    const pdf = new TextEncoder().encode("%PDF-1.4\n");
    expect(assertAllowedUpload(pdf, "doc.pdf", "application/pdf")).toBe(
      "application/pdf",
    );
    expect(() => assertAllowedUpload(pdf, "doc.txt", "text/plain")).toThrow(
      UnsupportedTypeError,
    );
  });

  it("rejects zip without docx markers", () => {
    const zip = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]);
    expect(() => assertAllowedUpload(zip, "x.docx", "application/zip")).toThrow(
      ForbiddenFileError,
    );
  });

  it("accepts docx with word/document.xml", () => {
    const inner = "word/document.xml";
    const zip = new Uint8Array([
      0x50,
      0x4b,
      0x03,
      0x04,
      ...new TextEncoder().encode(inner),
    ]);
    expect(
      assertAllowedUpload(
        zip,
        "x.docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ),
    ).toContain("wordprocessingml");
  });

  it("rejects exe extension even for png bytes", () => {
    expect(() => assertAllowedUpload(PNG_HEADER, "x.exe", "image/png")).toThrow(
      ForbiddenFileError,
    );
  });

  it("rejects shebang", () => {
    const sh = new TextEncoder().encode("#!/bin/bash\n");
    expect(() => assertAllowedUpload(sh, "run.sh", "text/plain")).toThrow(
      ForbiddenFileError,
    );
  });
});
