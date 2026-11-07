import type { PrismaClient } from "@rwos/database";

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
