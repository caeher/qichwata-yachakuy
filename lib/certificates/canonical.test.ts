import { describe, expect, it } from "vitest";

import {
  canonicalCertificateJson,
  hashCertificatePayload,
} from "@/lib/certificates/canonical";

describe("certificate canonical payload v1", () => {
  const values = {
    certificateId: "018f0000-0000-7000-8000-000000000001",
    beneficiaryRef: "018f0000-0000-7000-8000-000000000001",
    issuer: "Instituto Quechua",
    course: {
      slug: "introduccion-quechua",
      version: "1.0",
      title: "Quechua básico",
    },
    policyVersion: "v1",
    completedAt: new Date("2026-01-02T03:04:05.000Z"),
    issuedAt: new Date("2026-01-02T03:05:00.000Z"),
  };

  it("matches the published UTF-8 JSON and SHA-256 vector", () => {
    const canonical = canonicalCertificateJson(values);
    expect(canonical).toBe(
      '{"schemaVersion":1,"certificateId":"018f0000-0000-7000-8000-000000000001","beneficiaryRef":"018f0000-0000-7000-8000-000000000001","issuer":"Instituto Quechua","course":{"slug":"introduccion-quechua","version":"1.0","title":"Quechua básico"},"completion":{"policyVersion":"v1","completedAt":"2026-01-02T03:04:05.000Z"},"issuedAt":"2026-01-02T03:05:00.000Z"}',
    );
    expect(hashCertificatePayload(canonical)).toBe(
      "3686598766f1a8b18de273f1381b6d2675aff95fedeba783c4ce5831c007666d",
    );
  });

  it("normalizes equivalent Unicode to NFC and changes with relevant fields", () => {
    const decomposed = canonicalCertificateJson({
      ...values,
      issuer: "Instituto Quechua e\u0301",
    });
    const composed = canonicalCertificateJson({
      ...values,
      issuer: "Instituto Quechua é",
    });
    expect(decomposed).toBe(composed);
    expect(hashCertificatePayload(decomposed)).not.toBe(
      hashCertificatePayload(
        canonicalCertificateJson({
          ...values,
          course: { ...values.course, version: "2.0" },
        }),
      ),
    );
  });
});
