import { describe, expect, it } from "vitest";
import {
  localAuditEventSchema,
  shiftOfferSchema,
  workerApplicationSchema,
  workerApplicationSummarySchema,
  workerConfirmationSchema
} from "./index";

const shiftSnapshot = {
  addressSummary: "Rosemont area",
  applicationDeadline: "2026-07-14T09:00:00.000Z",
  breakPolicy: "Break coordinated with supervisor.",
  cancellationPolicy: "Dispatcher review required.",
  category: "kitchen",
  city: "Montreal",
  country: "CA",
  currency: "CAD",
  dressCode: "Kitchen whites.",
  employerId: "residence_sunrise",
  employerName: "Sunrise Residence",
  endAt: "2026-07-14T18:00:00.000Z",
  estimatedTotal: { amountMinor: 40000, currency: "CAD" },
  hourlyRate: { amountMinor: 5000, currency: "CAD" },
  id: "shift_001",
  province: "QC",
  requiredCertifications: ["Food safety"],
  requiredExperienceYears: 3,
  requiredLanguages: ["fr", "en"],
  startAt: "2026-07-14T10:00:00.000Z",
  status: "open",
  title: "Emergency Chef",
  urgency: "immediate"
} as const;

describe("G02 application validation", () => {
  it("accepts a valid worker application", () => {
    expect(
      workerApplicationSchema.parse({
        id: "app_001",
        rejectionReason: null,
        shiftId: "shift_001",
        source: "worker_initiated",
        status: "submitted",
        submittedAt: "2026-07-13T13:00:00.000Z",
        updatedAt: "2026-07-13T13:00:00.000Z",
        withdrawnAt: null,
        workerId: "worker_001",
        workerNote: "I can work this emergency shift."
      })
    ).toMatchObject({ status: "submitted" });
  });

  it("rejects an invalid application status", () => {
    expect(() =>
      workerApplicationSchema.parse({
        id: "app_001",
        rejectionReason: null,
        shiftId: "shift_001",
        source: "worker_initiated",
        status: "approved",
        submittedAt: "2026-07-13T13:00:00.000Z",
        updatedAt: "2026-07-13T13:00:00.000Z",
        withdrawnAt: null,
        workerId: "worker_001",
        workerNote: null
      })
    ).toThrow();
  });

  it("rejects an expired offer that expires before it was offered", () => {
    expect(() =>
      shiftOfferSchema.parse({
        applicationId: "app_001",
        createdAt: "2026-07-13T13:00:00.000Z",
        currentShiftSnapshot: shiftSnapshot,
        employerId: "residence_sunrise",
        expiresAt: "2026-07-13T12:59:00.000Z",
        id: "offer_001",
        message: null,
        offeredAt: "2026-07-13T13:00:00.000Z",
        originalShiftSnapshot: shiftSnapshot,
        respondedAt: null,
        shiftId: "shift_001",
        status: "pending",
        updatedAt: "2026-07-13T13:00:00.000Z",
        workerId: "worker_001"
      })
    ).toThrow();
  });

  it("rejects a confirmation deadline before request time", () => {
    expect(() =>
      workerConfirmationSchema.parse({
        applicationId: "app_001",
        confirmedAt: null,
        createdAt: "2026-07-13T13:00:00.000Z",
        declinedAt: null,
        expiresAt: "2026-07-13T12:00:00.000Z",
        id: "confirmation_001",
        offerId: "offer_001",
        requestedAt: "2026-07-13T13:00:00.000Z",
        shiftId: "shift_001",
        status: "pending",
        updatedAt: "2026-07-13T13:00:00.000Z",
        workerId: "worker_001"
      })
    ).toThrow();
  });

  it("accepts a local audit event", () => {
    expect(
      localAuditEventSchema.parse({
        action: "application.submitted",
        actorId: "worker_001",
        actorType: "worker",
        correlationId: "corr_001",
        entityId: "app_001",
        entityType: "application",
        id: "audit_001",
        reason: null,
        result: "success",
        timestamp: "2026-07-13T13:00:00.000Z"
      })
    ).toMatchObject({ action: "application.submitted" });
  });

  it("rejects cross-worker and cross-shift records in an application summary", () => {
    const application = {
      id: "app_001",
      rejectionReason: null,
      shiftId: "shift_001",
      source: "worker_initiated" as const,
      status: "submitted" as const,
      submittedAt: "2026-07-13T13:00:00.000Z",
      updatedAt: "2026-07-13T13:00:00.000Z",
      withdrawnAt: null,
      workerId: "worker_001",
      workerNote: null
    };
    const offer = {
      applicationId: application.id,
      createdAt: "2026-07-13T13:00:00.000Z",
      currentShiftSnapshot: shiftSnapshot,
      employerId: shiftSnapshot.employerId,
      expiresAt: "2026-07-13T15:00:00.000Z",
      id: "offer_001",
      message: null,
      offeredAt: "2026-07-13T13:00:00.000Z",
      originalShiftSnapshot: shiftSnapshot,
      respondedAt: null,
      shiftId: application.shiftId,
      status: "pending" as const,
      updatedAt: "2026-07-13T13:00:00.000Z",
      workerId: application.workerId
    };
    const confirmation = {
      applicationId: application.id,
      confirmedAt: null,
      createdAt: "2026-07-13T13:00:00.000Z",
      declinedAt: null,
      expiresAt: "2026-07-13T16:00:00.000Z",
      id: "confirmation_001",
      offerId: offer.id,
      requestedAt: "2026-07-13T14:00:00.000Z",
      shiftId: application.shiftId,
      status: "pending" as const,
      updatedAt: "2026-07-13T14:00:00.000Z",
      workerId: application.workerId
    };

    expect(() =>
      workerApplicationSummarySchema.parse({
        application,
        shift: shiftSnapshot,
        offer: { ...offer, workerId: "worker_002" },
        confirmation
      })
    ).toThrow();
    expect(() =>
      workerApplicationSummarySchema.parse({
        application,
        shift: { ...shiftSnapshot, id: "shift_002" },
        offer,
        confirmation
      })
    ).toThrow();
    expect(() =>
      workerApplicationSummarySchema.parse({
        application,
        shift: shiftSnapshot,
        offer,
        confirmation: { ...confirmation, offerId: "offer_002" }
      })
    ).toThrow();
  });
});
