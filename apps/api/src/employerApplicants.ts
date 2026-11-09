import type { PrismaClient } from "@rwos/database";
import { certificateDocumentTypes, heldCertificateKeys, type ListedCertificateKey } from "@rwos/shared";

// What an employer may see about a worker who is interested in their job: enough to form a view,
// nothing that identifies or reaches the person. Contact details, addresses and pay stay out.
export type EmployerApplicantView = Readonly<{
  interestId: string;
  firstName: string | null;
  verified: boolean;
  completedShifts: number;
  status: "interested" | "shortlisted" | "offer_sent" | "assigned" | "not_selected";
  favorite: boolean;
}>;

const STATUS_FOR_EMPLOYER: Record<string, EmployerApplicantView["status"]> = {
  submitted: "interested",
  under_review: "interested",
  shortlisted: "shortlisted",
  offer_created: "offer_sent",
  offer_accepted: "assigned",
  not_selected: "not_selected"
};

export function firstNameOf(displayName: string | null): string | null {
  return displayName?.trim().split(/\s+/)[0] || null;
}

export async function listEmployerApplicants(
  prisma: PrismaClient,
  input: { organizationId: string; jobRequestId: string }
): Promise<EmployerApplicantView[]> {
  const rows = await prisma.workerJobInterest.findMany({
    where: { organizationId: input.organizationId, jobRequestId: input.jobRequestId, status: { not: "withdrawn" } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      status: true,
      workerIdentityId: true,
      employerFavoritedAt: true,
      worker: { select: { displayName: true, verifications: { where: { status: "verified" }, select: { id: true }, take: 1 } } }
    }
  });
  const completed = await prisma.attendanceRecord.groupBy({
    by: ["workerIdentityId"],
    where: { workerIdentityId: { in: rows.map((row) => row.workerIdentityId) }, status: "completed" },
    _count: { _all: true }
  });
  const completedByWorker = new Map(completed.map((row) => [row.workerIdentityId, row._count._all]));
  return rows.map((row) => ({
    interestId: row.id,
    firstName: firstNameOf(row.worker.displayName),
    verified: row.worker.verifications.length > 0,
    completedShifts: completedByWorker.get(row.workerIdentityId) ?? 0,
    status: STATUS_FOR_EMPLOYER[row.status] ?? "interested",
    favorite: row.employerFavoritedAt !== null
  }));
}

// Marks or clears a favourite. Scoped to this employer's job, so one employer can never touch
// another's. Staff still decide who gets an offer: no interest status changes here.
export async function setEmployerFavorite(
  prisma: PrismaClient,
  input: {
    organizationId: string;
    jobRequestId: string;
    interestId: string;
    favorite: boolean;
    actorUserId: string;
  }
): Promise<boolean> {
  const updated = await prisma.workerJobInterest.updateMany({
    where: {
      id: input.interestId,
      organizationId: input.organizationId,
      jobRequestId: input.jobRequestId,
      status: { notIn: ["withdrawn", "not_selected"] }
    },
    data: input.favorite
      ? { employerFavoritedAt: new Date(), employerFavoritedByUserId: input.actorUserId }
      : { employerFavoritedAt: null, employerFavoritedByUserId: null }
  });
  return updated.count === 1;
}

// ── Long-term jobs: the employer chooses ────────────────────────────────────────────────────────
// A long-term listing is hired and paid directly by the employer, so they see a bit more to choose:
// first name, city, verified certificates and the worker's own profile headline. Phone and email
// appear only after the employer chooses "Contact" or "Hire". Never pay rates, never Joblop's share.

export type LongTermApplicantView = Readonly<{
  interestId: string;
  firstName: string | null;
  city: string | null;
  verified: boolean;
  certificates: readonly ListedCertificateKey[];
  profileSummary: string | null;
  decision: "shortlisted" | "hired" | "not_selected" | null;
  contact: Readonly<{ email: string | null; phone: string | null }> | null;
  appliedAt: string;
}>;

export async function listLongTermApplicants(
  prisma: PrismaClient,
  input: { organizationId: string; jobRequestId: string; now?: Date }
): Promise<LongTermApplicantView[]> {
  const rows = await prisma.workerJobInterest.findMany({
    where: { organizationId: input.organizationId, jobRequestId: input.jobRequestId, status: { not: "withdrawn" } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      workerIdentityId: true,
      employerDecision: true,
      employerContactRevealedAt: true,
      createdAt: true,
      worker: {
        select: {
          displayName: true,
          userId: true,
          verifications: { where: { status: "verified" }, select: { id: true }, take: 1 },
          hrIntake: { select: { city: true, phone: true } },
          user: { select: { emailNormalized: true, phone: true } }
        }
      }
    }
  });
  if (rows.length === 0) return [];
  const workerIds = rows.map((row) => row.workerIdentityId);
  const [documents, cvs] = await Promise.all([
    prisma.hrDocument.findMany({
      where: {
        workerIdentityId: { in: workerIds },
        status: "accepted",
        OR: [{ documentType: { in: [...certificateDocumentTypes()] } }, { verifiedCertificateKey: { not: null } }]
      },
      select: { workerIdentityId: true, documentType: true, verifiedCertificateKey: true, status: true, expiresAt: true }
    }),
    prisma.workerCv.findMany({
      where: { workerRef: { in: [...workerIds, ...rows.map((row) => row.worker.userId)] } },
      select: { workerRef: true, headline: true }
    })
  ]);
  const now = input.now ?? new Date();
  const headlineByRef = new Map(cvs.map((cv) => [cv.workerRef, cv.headline]));
  return rows.map((row) => {
    const revealed = row.employerContactRevealedAt !== null;
    const held = heldCertificateKeys(documents.filter((doc) => doc.workerIdentityId === row.workerIdentityId), now);
    const decision = row.employerDecision === "shortlisted" || row.employerDecision === "hired" || row.employerDecision === "not_selected" ? row.employerDecision : null;
    return {
      interestId: row.id,
      firstName: firstNameOf(row.worker.displayName),
      city: row.worker.hrIntake?.city?.trim() || null,
      verified: row.worker.verifications.length > 0,
      certificates: [...held],
      profileSummary: (headlineByRef.get(row.workerIdentityId) ?? headlineByRef.get(row.worker.userId) ?? null)?.slice(0, 280) ?? null,
      decision,
      contact: revealed
        ? { email: row.worker.user.emailNormalized ?? null, phone: row.worker.user.phone ?? row.worker.hrIntake?.phone ?? null }
        : null,
      appliedAt: row.createdAt.toISOString()
    };
  });
}
