import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@rwos/database";
import {
  certificateDocumentTypes,
  missingCertificateReason,
  missingCertificates,
  storedRequiredCertificates,
  type RequiredCertificateKey,
  type RequiredCertificates
} from "@rwos/shared";

// Server-side enforcement of the certificates an employer requires on a job. A worker "holds" one
// when a document proving it is accepted by staff on their HR profile and is not expired when the
// job starts (or now, if the job already started). Nothing from the browser is trusted.

type CertificatePrisma = Pick<PrismaClient, "hrDocument" | "jobRequest">;

export type CertificateJob = Readonly<{
  startAt: Date;
  requiredCertificates?: readonly string[] | null;
  requiredCertificateOther?: string | null;
}>;

export type CertificateGap = Readonly<{
  required: RequiredCertificates;
  /** Missing keys, "other" included when the job asks for one (a person checks it). */
  missing: readonly RequiredCertificateKey[];
}>;

export const NO_CERTIFICATE_GAP: CertificateGap = { required: { keys: [], other: null }, missing: [] };

/** What this worker is missing for this job. No requirement → no database read. */
export async function certificateGapForJob(
  prisma: Pick<PrismaClient, "hrDocument">,
  input: Readonly<{ workerIdentityId: string; job: CertificateJob; now?: Date }>
): Promise<CertificateGap> {
  const required = storedRequiredCertificates(input.job);
  if (required.keys.length === 0) return { required, missing: [] };
  const now = input.now ?? new Date();
  const validAt = input.job.startAt.getTime() > now.getTime() ? input.job.startAt : now;
  const documents = await prisma.hrDocument.findMany({
    where: {
      workerIdentityId: input.workerIdentityId,
      status: "accepted",
      OR: [{ documentType: { in: [...certificateDocumentTypes()] } }, { verifiedCertificateKey: { not: null } }]
    },
    select: { documentType: true, verifiedCertificateKey: true, status: true, expiresAt: true }
  });
  return { required, missing: missingCertificates(required, documents, validAt) };
}

/** Same, by job id (null when the job does not exist). */
export async function certificateGapForJobId(
  prisma: CertificatePrisma,
  input: Readonly<{ workerIdentityId: string; jobRequestId: string; now?: Date }>
): Promise<CertificateGap | null> {
  const job = await prisma.jobRequest.findUnique({
    where: { id: input.jobRequestId },
    select: { startAt: true, requiredCertificates: true, requiredCertificateOther: true }
  });
  if (!job) return null;
  return certificateGapForJob(prisma, { workerIdentityId: input.workerIdentityId, job, ...(input.now ? { now: input.now } : {}) });
}

/** Eligibility reason codes for the missing certificates. */
export function certificateReasons(missing: readonly RequiredCertificateKey[]): string[] {
  return missing.map(missingCertificateReason);
}

/**
 * Missing certificates that block applying / expressing interest. "Other" does not block here: the
 * application reaches a person (staff for short-term, the employer for long-term) who checks it
 * before anyone is assigned or hired.
 */
export function applyBlockingCertificates(missing: readonly RequiredCertificateKey[]): RequiredCertificateKey[] {
  return missing.filter((key) => key !== "other");
}

/**
 * Staff approve a worker who misses a certificate. Recorded on the offer (so the worker can accept it
 * and staff can assign) and appended to audit_events as certificate.override with the missing list.
 */
export async function recordCertificateOverride(
  prisma: Pick<PrismaClient, "$transaction">,
  input: Readonly<{
    workerOfferId: string;
    organizationId: string;
    jobRequestId: string;
    actorUserId: string;
    missing: readonly RequiredCertificateKey[];
    reason: string | null;
    source: "offer_create" | "assignment_create";
    now?: Date;
  }>
): Promise<void> {
  const at = input.now ?? new Date();
  const reason = `${input.source}; missing: ${input.missing.join(", ")}${input.reason ? `; note: ${input.reason.slice(0, 500)}` : ""}`;
  await prisma.$transaction(async (tx) => {
    await tx.workerOffer.update({
      where: { id: input.workerOfferId },
      data: { certificateOverrideAt: at, certificateOverrideByUserId: input.actorUserId, certificateOverrideReason: reason }
    });
    const actor = await tx.auditActorReference.create({
      data: { actorType: "user", userId: input.actorUserId, organizationId: input.organizationId, displayLabel: "Certificate override" }
    });
    await tx.auditEvent.create({
      data: {
        actorReferenceId: actor.id,
        organizationId: input.organizationId,
        entityType: "worker_offer",
        entityId: input.workerOfferId,
        entityPublicReference: input.jobRequestId,
        action: "certificate.override",
        priorState: "certificate_missing",
        newState: "certificate_override",
        reason,
        source: "api",
        correlationId: randomUUID(),
        policyVersion: "required-certificates-v1",
        createdAt: at
      }
    });
  });
}

/** Body flag staff tick to approve despite a missing certificate. */
export function readCertificateOverride(body: Readonly<Record<string, unknown>>): { override: boolean; reason: string | null } {
  const reason = typeof body.certificateOverrideReason === "string" ? body.certificateOverrideReason.trim() || null : null;
  return { override: body.certificateOverride === true, reason };
}

export type CertificateRefusal = Readonly<{
  error: "RWOS_CERTIFICATE_REQUIRED";
  message: string;
  reasons: readonly string[];
  requiredCertificateOther: string | null;
}>;

/**
 * Before a worker accepts an offer: the refusal body when the worker misses a required certificate
 * and staff did not approve them with the certificate override. Null when the offer is not this
 * worker's (the offer service refuses it) or nothing is missing.
 */
export async function offerCertificateRefusal(
  prisma: Pick<PrismaClient, "workerOffer" | "hrDocument">,
  input: Readonly<{ workerOfferId: string; userId: string; now?: Date }>
): Promise<CertificateRefusal | null> {
  if (!/^[0-9a-f-]{36}$/i.test(input.workerOfferId)) return null;
  const offer = await prisma.workerOffer.findUnique({
    where: { id: input.workerOfferId },
    select: {
      workerIdentityId: true,
      certificateOverrideAt: true,
      workerIdentity: { select: { userId: true } },
      jobRequest: { select: { startAt: true, requiredCertificates: true, requiredCertificateOther: true } }
    }
  });
  if (!offer || offer.workerIdentity.userId !== input.userId || offer.certificateOverrideAt) return null;
  const gap = await certificateGapForJob(prisma, {
    workerIdentityId: offer.workerIdentityId,
    job: offer.jobRequest,
    ...(input.now ? { now: input.now } : {})
  });
  if (gap.missing.length === 0) return null;
  return {
    error: "RWOS_CERTIFICATE_REQUIRED",
    message: "You need every certificate this job requires before you can accept it. Add it on your Documents page.",
    reasons: certificateReasons(gap.missing),
    requiredCertificateOther: gap.required.other
  };
}

/** `{ requiredCertificates }` for a worker-facing job payload, or `{}` when the job requires none. */
export function requiredCertificatesField(row: Readonly<{ requiredCertificates?: readonly string[] | null; requiredCertificateOther?: string | null }>):
  Readonly<{ requiredCertificates: RequiredCertificates }> | Readonly<Record<string, never>> {
  const required = storedRequiredCertificates(row);
  return required.keys.length > 0 ? { requiredCertificates: required } : {};
}
