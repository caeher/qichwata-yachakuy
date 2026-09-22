import { describe, expect, it } from "vitest";

import { buildSignedGetInput, isMissingObjectError } from "@/lib/storage/s3";

describe("s3-sign helpers", () => {
  it("isMissingObjectError", () => {
    expect(isMissingObjectError({ name: "NoSuchKey" })).toBe(true);
    expect(isMissingObjectError({ name: "NotFound" })).toBe(true);
    expect(isMissingObjectError({ name: "AccessDenied" })).toBe(false);
  });

  it("buildSignedGetInput sanitizes filename", () => {
    const input = buildSignedGetInput("b", "k", {
      expiresInSeconds: 60,
      downloadName: "folder/x.pdf",
      contentType: "application/pdf",
    });
    expect(input.Bucket).toBe("b");
    expect(input.Key).toBe("k");
    expect(input.ResponseContentType).toBe("application/pdf");
    expect(input.ResponseContentDisposition).toBe(
      'attachment; filename="x.pdf"',
    );
  });
});
