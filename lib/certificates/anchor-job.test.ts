import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";

import { createTestDb } from "@/db/pglite";
import { publishedUnitContent } from "@/db/test-fixtures";
import { anchors, certificates, courseUnits, courses } from "@/db/schema";
import { provisionUser } from "@/lib/auth/provision-user";
import { runCertificateAnchorJob } from "@/lib/certificates/anchor-job";
import { verifyCertificateByHash } from "@/lib/certificates/verify";
import {
  enrollInCourse,
  completeUnit,
  finalizeEnrollment,
} from "@/lib/education/service";
import type { AnchorClient } from "@/lib/stellar/anchor-types";

const OPERATOR = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

async function pendingCertificate() {
  const { db } = await createTestDb();
  const { userId } = await provisionUser(db, {
    clerkUserId: "certificate-job-user",
    email: null,
  });
  const [course] = await db
    .insert(courses)
    .values({
      slug: "test",
      title: "Curso controlado",
      version: "1",
      status: "published",
      enrollmentEnabled: true,
    })
    .returning();
  const [unit] = await db
    .insert(courseUnits)
    .values({
      courseId: course.id,
      position: 1,
      title: "Unidad",
      content: publishedUnitContent(),
    })
    .returning();
  const enrollment = await enrollInCourse(db, { userId, courseId: course.id });
  await completeUnit(db, {
    userId,
    enrollmentId: enrollment.id,
    unitId: unit.id,
  });
  const { certificate } = await finalizeEnrollment(db, {
    userId,
    enrollmentId: enrollment.id,
    issuer: "Emisor de prueba",
    policy: () => ({ eligible: true, policyVersion: "fixture-v1" }),
  });
  return { db, userId, certificate: certificate! };
}

describe("certificate anchor job", () => {
  it("keeps the persisted intent pending when Stellar is not configured", async () => {
    const { db, certificate } = await pendingCertificate();
    const result = await runCertificateAnchorJob(db, null, certificate.id);
    expect(result).toMatchObject({
      status: "pending",
      reason: "configuration_required",
    });
    expect(
      (
        await db.query.certificates.findFirst({
          where: eq(certificates.id, certificate.id),
        })
      )?.status,
    ).toBe("pending");
  });

  it("anchors only when the contract reports the expected hash, metadata, and operator", async () => {
    const { db, certificate, userId } = await pendingCertificate();
    let anchored = false;
    const expectedMeta = `cert:${certificate.publicId}`;
    const chain: AnchorClient = {
      verify: vi.fn(async () =>
        anchored
          ? { owner: OPERATOR, metaCid: expectedMeta, ledger: 42, timestamp: 7 }
          : null,
      ),
      submitAnchor: vi.fn(async () => {
        anchored = true;
        return {
          txHash: "b".repeat(64),
          status: "SUCCESS" as const,
          ledger: 42,
          feeStroops: "100",
          record: {
            owner: OPERATOR,
            metaCid: expectedMeta,
            ledger: 42,
            timestamp: 7,
          },
          error: null,
        };
      }),
      poll: vi.fn(),
    };
    const result = await runCertificateAnchorJob(
      db,
      {
        network: "testnet",
        contractId: "CONTRACT",
        operatorPublicKey: OPERATOR,
        chain,
      },
      certificate.id,
    );
    expect(result).toMatchObject({
      status: "anchored",
      network: "testnet",
      sha256: certificate.sha256,
    });
    expect(chain.submitAnchor).toHaveBeenCalledWith(
      expect.objectContaining({
        hashHex: certificate.sha256,
        metaCid: expectedMeta,
        owner: OPERATOR,
      }),
    );
    expect(
      await db.query.anchors.findFirst({
        where: eq(anchors.certificateId, certificate.id),
      }),
    ).toMatchObject({
      txHash: "b".repeat(64),
      network: "testnet",
      contractId: "CONTRACT",
      ownerPublicKey: OPERATOR,
    });
    expect(
      (
        await db.query.certificates.findFirst({
          where: eq(certificates.id, certificate.id),
        })
      )?.status,
    ).toBe("anchored");
    const verification = await verifyCertificateByHash(
      db,
      async (hash) => ({ configured: true, record: await chain.verify(hash) }),
      certificate.sha256,
      { network: "testnet", contractId: "CONTRACT" },
    );
    expect(verification.status).toBe("anchored");
    expect(
      (await db.select().from(anchors)).filter(
        (row) => row.documentId === null,
      ),
    ).toHaveLength(1);
    expect(userId).toBeTruthy();
  });

  it("leaves transient RPC errors recoverable", async () => {
    const { db, certificate } = await pendingCertificate();
    const chain: AnchorClient = {
      verify: vi.fn().mockRejectedValue(new Error("rpc down")),
      submitAnchor: vi.fn(),
      poll: vi.fn(),
    };
    await expect(
      runCertificateAnchorJob(
        db,
        {
          network: "testnet",
          contractId: "CONTRACT",
          operatorPublicKey: OPERATOR,
          chain,
        },
        certificate.id,
      ),
    ).rejects.toThrow("rpc down");
    expect(
      (
        await db.query.certificates.findFirst({
          where: eq(certificates.id, certificate.id),
        })
      )?.status,
    ).toBe("pending");
  });

  it("reconciles a transaction after a worker restart", async () => {
    const { db, certificate } = await pendingCertificate();
    const txHash = "c".repeat(64);
    await db
      .update(certificates)
      .set({ pendingTxHash: txHash, pendingAt: new Date(Date.now() - 180_000) })
      .where(eq(certificates.id, certificate.id));
    const chain: AnchorClient = {
      verify: vi.fn().mockResolvedValue({
        owner: OPERATOR,
        metaCid: `cert:${certificate.publicId}`,
        ledger: 77,
        timestamp: 7,
      }),
      submitAnchor: vi.fn(),
      poll: vi.fn().mockResolvedValue({
        txHash,
        status: "SUCCESS",
        ledger: 77,
        feeStroops: "100",
        record: {
          owner: OPERATOR,
          metaCid: `cert:${certificate.publicId}`,
          ledger: 77,
          timestamp: 7,
        },
        error: null,
      }),
    };
    const result = await runCertificateAnchorJob(
      db,
      {
        network: "testnet",
        contractId: "CONTRACT",
        operatorPublicKey: OPERATOR,
        chain,
      },
      certificate.id,
    );
    expect(result?.status).toBe("anchored");
    expect(chain.submitAnchor).not.toHaveBeenCalled();
    expect(
      await db.query.anchors.findFirst({
        where: eq(anchors.certificateId, certificate.id),
      }),
    ).toMatchObject({ txHash });
  });

  it("rejects an altered snapshot and does not submit a conflicting on-chain record", async () => {
    const { db, certificate } = await pendingCertificate();
    await db
      .update(certificates)
      .set({
        snapshot: { ...(certificate.snapshot as object), issuer: "altered" },
      })
      .where(eq(certificates.id, certificate.id));
    const verified = await verifyCertificateByHash(
      db,
      async () => ({ configured: true, record: null }),
      certificate.sha256,
      { network: "testnet", contractId: "CONTRACT" },
    );
    expect(verified.status).toBe("integrity_mismatch");

    const { db: secondDb, certificate: second } = await pendingCertificate();
    const conflicting: AnchorClient = {
      verify: vi.fn().mockResolvedValue({
        owner: "GOTHER",
        metaCid: `cert:${second.publicId}`,
        ledger: 9,
        timestamp: 1,
      }),
      submitAnchor: vi.fn(),
      poll: vi.fn(),
    };
    const result = await runCertificateAnchorJob(
      secondDb,
      {
        network: "testnet",
        contractId: "CONTRACT",
        operatorPublicKey: OPERATOR,
        chain: conflicting,
      },
      second.id,
    );
    expect(result?.status).toBe("failed");
    expect(conflicting.submitAnchor).not.toHaveBeenCalled();
  });
});
