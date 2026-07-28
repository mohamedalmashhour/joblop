import { describe, expect, it } from "vitest";
import type { WorkerApplicationRepositoryState } from "./repository";
import {
  createDefaultApplicationState,
  MockWorkerApplicationRepository
} from "./mockWorkerApplicationRepository";
import { mockShiftDiscoveryRecords } from "../../data/mock/shifts";

describe("MockWorkerApplicationRepository", () => {
  const demoRepository = () =>
    new MockWorkerApplicationRepository(
      mockShiftDiscoveryRecords,
      createDefaultApplicationState(mockShiftDiscoveryRecords)
    );

  it("submits a worker application and writes a local audit event", async () => {
    const repository = demoRepository();

    const summary = await repository.submitApplication({
      shiftId: "shift_housekeeping_003",
      workerId: "worker_demo_002",
      workerNote: "I can cover this shift."
    });

    expect(summary.application.status).toBe("submitted");
    expect(summary.application.workerNote).toBe("I can cover this shift.");
    await expect(repository.listAuditEvents()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "application.submitted",
          entityId: summary.application.id,
          result: "success"
        })
      ])
    );
  });

  it("blocks duplicate active applications for the same worker and shift", async () => {
    const repository = demoRepository();

    await expect(
      repository.submitApplication({
        shiftId: "shift_emergency_chef_001",
        workerId: "worker_demo_001"
      })
    ).rejects.toMatchObject({ code: "duplicate_application" });

    const audit = await repository.listAuditEvents();
    expect(audit[0]).toMatchObject({
      action: "application.duplicate_blocked",
      result: "blocked"
    });
  });

  it("withdraws an application that is still active", async () => {
    const repository = demoRepository();

    const summary = await repository.withdrawApplication("app_existing_chef_001");

    expect(summary.application.status).toBe("withdrawn");
    expect(summary.application.withdrawnAt).not.toBeNull();
  });

  it("accepts an offer and exposes the changed current terms", async () => {
    const repository = demoRepository();

    const summary = await repository.acceptOffer("offer_care_002");

    expect(summary.application.status).toBe("accepted");
    expect(summary.offer?.status).toBe("accepted");
    expect(summary.offer?.currentShiftSnapshot.endAt).toBe("2026-07-16T05:00:00.000Z");
    expect(summary.offer?.originalShiftSnapshot.endAt).toBe("2026-07-16T04:00:00.000Z");
  });

  it("declines an offer into a terminal rejected application state", async () => {
    const repository = demoRepository();

    const summary = await repository.declineOffer("offer_care_002");

    expect(summary.application.status).toBe("rejected");
    expect(summary.offer?.status).toBe("declined");
  });

  it("records final shift confirmation separately from offer acceptance", async () => {
    const repository = demoRepository();

    const summary = await repository.confirmShift("confirmation_housekeeping_003");

    expect(summary.application.status).toBe("confirmed");
    expect(summary.confirmation?.status).toBe("confirmed");
    expect(summary.confirmation?.confirmedAt).not.toBeNull();
  });

  it("blocks a repeated terminal offer transition", async () => {
    const repository = demoRepository();

    await repository.acceptOffer("offer_care_002");

    await expect(repository.acceptOffer("offer_care_002")).rejects.toMatchObject({
      code: "invalid_transition"
    });
  });

  it("blocks expired offers before changing application state", async () => {
    const state = createExpiredOfferState();
    const repository = new MockWorkerApplicationRepository(mockShiftDiscoveryRecords, state);

    await expect(repository.acceptOffer("offer_care_002")).rejects.toMatchObject({
      code: "expired_action"
    });

    const summary = await repository.getApplicationById("app_offer_care_002");
    expect(summary?.application.status).toBe("offered");
  });

  it("lists worker application summaries with related offers and confirmations", async () => {
    const repository = demoRepository();

    const summaries = await repository.listWorkerApplications("worker_demo_001");

    expect(summaries.map((summary) => summary.application.id)).toEqual([
      "app_existing_chef_001",
      "app_offer_care_002",
      "app_confirm_housekeeping_003"
    ]);
    expect(summaries.some((summary) => summary.offer?.id === "offer_care_002")).toBe(true);
    expect(
      summaries.some((summary) => summary.confirmation?.id === "confirmation_housekeeping_003")
    ).toBe(true);
  });
});

function createExpiredOfferState(): WorkerApplicationRepositoryState {
  const state = createDefaultApplicationState(mockShiftDiscoveryRecords);
  return {
    ...state,
    offers: state.offers.map((offer) =>
      offer.id === "offer_care_002"
        ? {
            ...offer,
            expiresAt: "2026-07-13T12:59:00.000Z"
          }
        : offer
    )
  };
}
