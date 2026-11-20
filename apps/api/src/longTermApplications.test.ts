import type { PrismaClient } from "@rwos/database";
import { describe, expect, it, vi } from "vitest";
import { applicationDecisionEmail, applyEmployerApplicantAction, isEmployerApplicantAction } from "./longTermApplications";

const NOW = new Date("2026-11-20T12:00:00.000Z");
const base = { organizationId: "org", jobRequestId: "job", interestId: "i", actorUserId: "emp", now: NOW };

function prismaWith(job: unknown, interest: unknown) {
  return {
    jobRequest: { findFirst: vi.fn(async () => job) },
    workerJobInterest: { findFirst: vi.fn(async () => interest), update: vi.fn(async () => ({})) }
  };
}
const interest = (extra: Record<string, unknown> = {}) => ({ id: "i", employerDecision: null, employerContactRevealedAt: null, worker: { userId: "wu" }, ...extra });

describe("employer choosing on a long-term job", () => {
  it("accepts only the four actions", () => {
    expect(isEmployerApplicantAction("hire")).toBe(true);
    expect(isEmployerApplicantAction("delete")).toBe(false);
  });

  it("refuses a short-term job and another employer's job", async () => {
    expect(await applyEmployerApplicantAction(prismaWith({ id: "job", jobLength: "short_term" }, interest()) as unknown as PrismaClient, { ...base, action: "hire" })).toEqual({ status: "not_long_term" });
    expect(await applyEmployerApplicantAction(prismaWith(null, interest()) as unknown as PrismaClient, { ...base, action: "hire" })).toEqual({ status: "not_found" });
  });

  it("Contact only reveals contact details and tells the worker nothing", async () => {
    const prisma = prismaWith({ id: "job", jobLength: "long_term" }, interest());
    const result = await applyEmployerApplicantAction(prisma as unknown as PrismaClient, { ...base, action: "contact" });
    expect(result).toMatchObject({ status: "ok", contactRevealed: true, notify: null, decision: null });
    expect(prisma.workerJobInterest.update).toHaveBeenCalledWith({ where: { id: "i" }, data: { employerContactRevealedAt: NOW } });
  });

  it("Hire reveals contact, records the choice and notifies once", async () => {
    const prisma = prismaWith({ id: "job", jobLength: "long_term" }, interest());
    const result = await applyEmployerApplicantAction(prisma as unknown as PrismaClient, { ...base, action: "hire" });
    expect(result).toMatchObject({ status: "ok", decision: "hired", notify: "hired", contactRevealed: true, workerUserId: "wu" });
    expect(prisma.workerJobInterest.update).toHaveBeenCalledWith({
      where: { id: "i" },
      data: { employerDecision: "hired", employerDecidedAt: NOW, employerDecidedByUserId: "emp", status: "offer_accepted", employerContactRevealedAt: NOW }
    });
    const again = prismaWith({ id: "job", jobLength: "long_term" }, interest({ employerDecision: "hired", employerContactRevealedAt: NOW }));
    expect(await applyEmployerApplicantAction(again as unknown as PrismaClient, { ...base, action: "hire" })).toMatchObject({ notify: null });
    expect(again.workerJobInterest.update).not.toHaveBeenCalled();
  });

  it("Shortlist and Not selected keep contact hidden", async () => {
    const prisma = prismaWith({ id: "job", jobLength: "long_term" }, interest());
    const result = await applyEmployerApplicantAction(prisma as unknown as PrismaClient, { ...base, action: "not_selected" });
    expect(result).toMatchObject({ decision: "not_selected", contactRevealed: false, notify: "not_selected" });
  });

  it("tells the worker in English, French or Arabic", () => {
    const en = applicationDecisionEmail({ to: "w@x.y", language: "en", decision: "hired", jobTitle: "PAB nights", employerName: "Résidence A" });
    expect(en.subject).toContain("hired");
    expect(en.text).toContain("pays you directly");
    expect(applicationDecisionEmail({ to: "w@x.y", language: "fr", decision: "shortlisted", jobTitle: "PAB", employerName: "R" }).subject).toContain("courte liste");
    expect(applicationDecisionEmail({ to: "w@x.y", language: "ar", decision: "not_selected", jobTitle: "PAB", employerName: "R" }).text).toContain("مرشحاً آخر");
  });
});
