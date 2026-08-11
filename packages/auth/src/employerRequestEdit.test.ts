import { describe, expect, it } from "vitest";
import {
  EmployerRequestEditError,
  createEmployerRequestEditService,
  type EditMembershipReader,
  type ProfileWriter,
  type ProposalStore,
  type StoredChangeProposal
} from "./employerRequestEdit";

const ORG = "org-1";
const REQ = "req-1";
const OWNER: EditMembershipReader = {
  async listMemberships() { return [{ organizationId: ORG, status: "active", roleKeys: ["ORGANIZATION_OWNER"] }]; }
};

function makeStore() {
  const rows: StoredChangeProposal[] = [];
  let seq = 0;
  const store: ProposalStore = {
    async createProposal(input) {
      const row: StoredChangeProposal = {
        id: `cp-${++seq}`,
        organizationId: input.organizationId,
        jobRequestId: input.jobRequestId,
        status: input.status,
        materialFields: input.materialFields,
        affectedAssignmentIds: input.affectedAssignmentIds,
        originalTermsVersion: input.originalTermsVersion,
        proposedTermsVersion: input.proposedTermsVersion,
        governedRateMinor: input.governedRateMinor,
        currency: input.currency
      };
      rows.push(row);
      return row;
    },
    async findById(id) { return rows.find((r) => r.id === id) ?? null; },
    async updateStatus(id, status) {
      const row = rows.find((r) => r.id === id);
      if (!row) throw new Error("not found");
      (row as { status: StoredChangeProposal["status"] }).status = status;
      return row;
    },
    async listByStatus(statuses, limit) { return rows.filter((r) => statuses.includes(r.status)).slice(0, limit); }
  };
  return { store, rows };
}

function service(opts: { membership?: EditMembershipReader; profileApplied?: boolean } = {}) {
  const { store, rows } = makeStore();
  const profileCalls: unknown[] = [];
  const profileWriter: ProfileWriter = {
    async applyNonMaterialProfile(input) { profileCalls.push(input.fields); return opts.profileApplied ?? true; }
  };
  const svc = createEmployerRequestEditService({
    membershipReader: opts.membership ?? OWNER,
    profileWriter,
    proposalStore: store
  });
  return { svc, rows, profileCalls };
}

describe("employer request edit service", () => {
  it("applies a NON-MATERIAL edit directly (arrival instructions)", async () => {
    const { svc, profileCalls, rows } = service();
    const r = await svc.applyNonMaterialEdit({
      actorUserId: "u1", organizationId: ORG, jobRequestId: REQ,
      fields: { specialInstructions: "Enter via loading dock." }
    });
    expect(r.applied).toBe(true);
    expect(profileCalls).toHaveLength(1);
    expect(rows).toHaveLength(0); // no proposal for non-material
  });

  it("records a MATERIAL change as a proposal WITHOUT mutating accepted terms; reconfirmation_pending when confirmed workers affected", async () => {
    const { svc, rows } = service();
    const { proposal } = await svc.proposeMaterialChange({
      actorUserId: "u1", organizationId: ORG, jobRequestId: REQ,
      baseRequestVersion: 4,
      materialFields: ["work_date"],
      proposedValues: { startAt: "2026-09-01T20:00:00.000Z" },
      affectedAssignmentIds: ["as-1", "as-2"],
      governedRateMinor: 3000,
      currency: "CAD"
    });
    expect(proposal.status).toBe("reconfirmation_pending");
    expect(proposal.materialFields).toEqual(["work_date"]);
    expect(proposal.affectedAssignmentIds).toEqual(["as-1", "as-2"]);
    expect(proposal.originalTermsVersion).toBe(4);
    expect(proposal.proposedTermsVersion).toBe(5);
    expect(rows).toHaveLength(1);
  });

  it("a material change with NO confirmed workers affected → status proposed (no reconfirmation needed)", async () => {
    const { svc } = service();
    const { proposal } = await svc.proposeMaterialChange({
      actorUserId: "u1", organizationId: ORG, jobRequestId: REQ,
      baseRequestVersion: 1, materialFields: ["role"], proposedValues: { roleDefinitionId: "role-sous" },
      affectedAssignmentIds: [], governedRateMinor: 2800, currency: "CAD"
    });
    expect(proposal.status).toBe("proposed");
  });

  it("rejects a material proposal with no material fields", async () => {
    const { svc } = service();
    await expect(
      svc.proposeMaterialChange({ actorUserId: "u1", organizationId: ORG, jobRequestId: REQ, baseRequestVersion: 1, materialFields: [], proposedValues: {}, affectedAssignmentIds: [], governedRateMinor: null, currency: null })
    ).rejects.toMatchObject({ code: "invalid" });
  });

  it("completeReconfirmation: accepted → completed, declined → rejected; idempotent", async () => {
    const { svc } = service();
    const { proposal } = await svc.proposeMaterialChange({
      actorUserId: "u1", organizationId: ORG, jobRequestId: REQ, baseRequestVersion: 1, materialFields: ["work_location"], proposedValues: { residenceId: "res-2" }, affectedAssignmentIds: ["as-1"], governedRateMinor: 3000, currency: "CAD"
    });
    const accepted = await svc.completeReconfirmation({ proposalId: proposal.id, outcome: "accepted" });
    expect(accepted.proposal.status).toBe("completed");
    // idempotent — a second call does not flip a completed proposal
    const again = await svc.completeReconfirmation({ proposalId: proposal.id, outcome: "declined" });
    expect(again.proposal.status).toBe("completed");
  });

  it("declined reconfirmation → rejected (old terms preserved; not overwritten)", async () => {
    const { svc } = service();
    const { proposal } = await svc.proposeMaterialChange({
      actorUserId: "u1", organizationId: ORG, jobRequestId: REQ, baseRequestVersion: 1, materialFields: ["work_date"], proposedValues: {}, affectedAssignmentIds: ["as-1"], governedRateMinor: null, currency: null
    });
    const declined = await svc.completeReconfirmation({ proposalId: proposal.id, outcome: "declined" });
    expect(declined.proposal.status).toBe("rejected");
  });

  it("denies a non-owner", async () => {
    const staff = service({ membership: { async listMemberships() { return [{ organizationId: ORG, status: "active", roleKeys: ["ORGANIZATION_STAFF"] }]; } } });
    await expect(
      staff.svc.applyNonMaterialEdit({ actorUserId: "u1", organizationId: ORG, jobRequestId: REQ, fields: { specialInstructions: "x" } })
    ).rejects.toMatchObject({ code: "denied" });
    await expect(
      staff.svc.proposeMaterialChange({ actorUserId: "u1", organizationId: ORG, jobRequestId: REQ, baseRequestVersion: 1, materialFields: ["role"], proposedValues: {}, affectedAssignmentIds: [], governedRateMinor: null, currency: null })
    ).rejects.toBeInstanceOf(EmployerRequestEditError);
  });
});
