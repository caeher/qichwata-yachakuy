export type CertificatePayloadV1 = {
  schemaVersion: 1;
  certificateId: string;
  beneficiaryRef: string;
  issuer: string;
  course: { slug: string; version: string; title: string };
  completion: { policyVersion: string; completedAt: string };
  issuedAt: string;
};

function normalize(value: string) {
  return value.normalize("NFC").trim();
}

function utc(value: Date) {
  if (Number.isNaN(value.getTime())) throw new Error("invalid_certificate_date");
  return value.toISOString();
}

export function canonicalCertificateJson(input: {
  certificateId: string;
  beneficiaryRef: string;
  issuer: string;
  course: { slug: string; version: string; title: string };
  policyVersion: string;
  completedAt: Date;
  issuedAt: Date;
}): string {
  const payload: CertificatePayloadV1 = {
    schemaVersion: 1,
    certificateId: normalize(input.certificateId),
    beneficiaryRef: normalize(input.beneficiaryRef),
    issuer: normalize(input.issuer),
    course: {
      slug: normalize(input.course.slug),
      version: normalize(input.course.version),
      title: normalize(input.course.title),
    },
    completion: {
      policyVersion: normalize(input.policyVersion),
      completedAt: utc(input.completedAt),
    },
    issuedAt: utc(input.issuedAt),
  };
  return JSON.stringify(payload);
}

export async function hashCertificatePayload(canonicalJson: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalJson),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
