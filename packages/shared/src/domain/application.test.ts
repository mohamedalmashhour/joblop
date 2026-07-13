import { describe, expect, it } from "vitest";
import {
  canTransitionApplication,
  canTransitionConfirmation,
  canTransitionOffer,
  createShiftOfferSnapshot,
  type ShiftDiscoveryRecord
} from "./index";

const shiftFixture: ShiftDiscoveryRecord = {
  addressSummary: "Rosemont area",
  applicationDeadline: "2026-07-14T09:00:00.000Z",
  breakPolicy: "Break coordinated with supervisor.",
  cancellationPolicy: "Dispatcher review required.",
  category: "kitchen",
  city: "Montreal",
  country: "CA",
  createdAt: "2026-07-13T10:00:00.000Z",
  currency: "CAD",
  description: "Prepare lunch and dinner.",
  distanceKm: 5.2,
  dressCode: "Kitchen whites.",
  duties: ["Prepare meals"],
  employerId: "residence_sunrise",
  employerName: "Sunrise Residence",
  employerRating: 4.8,
  endAt: "2026-07-14T18:00:00.000Z",
  estimatedTotal: { amountMinor: 40000, currency: "CAD" },
  hourlyRate: { amountMinor: 5000, currency: "CAD" },
  id: "shift_001",
  latitude: 45.557,
  longitude: -73.579,
  province: "QC",
  requiredCertifications: ["Food safety"],
  requiredExperienceYears: 3,
  requiredLanguages: ["fr", "en"],
  startAt: "2026-07-14T10:00:00.000Z",
  status: "open",
  title: "Emergency Chef",
  updatedAt: "2026-07-13T10:15:00.000Z",
  urgency: "immediate"
};

describe("G02 application transitions", () => {
  it("allows the approved application path", () => {
    expect(canTransitionApplication("draft", "submitted").allowed).toBe(true);
    expect(canTransitionApplication("submitted", "under_review").allowed).toBe(true);
    expect(canTransitionApplication("under_review", "offered").allowed).toBe(true);
    expect(canTransitionApplication("offered", "accepted").allowed).toBe(true);
    expect(canTransitionApplication("accepted", "confirmed").allowed).toBe(true);
  });

  it("blocks invalid application transitions", () => {
    expect(canTransitionApplication("submitted", "confirmed")).toMatchObject({
      allowed: false,
      reason: "Invalid transition from submitted to confirmed"
    });
  });

  it("allows only pending offer decisions", () => {
    expect(canTransitionOffer("pending", "accepted").allowed).toBe(true);
    expect(canTransitionOffer("accepted", "declined").allowed).toBe(false);
  });

  it("allows only pending confirmation decisions", () => {
    expect(canTransitionConfirmation("pending", "confirmed").allowed).toBe(true);
    expect(canTransitionConfirmation("confirmed", "declined").allowed).toBe(false);
  });
});

describe("G02 immutable shift snapshots", () => {
  it("creates a worker-reviewable immutable offer snapshot from shift discovery", () => {
    const snapshot = createShiftOfferSnapshot(shiftFixture);

    expect(snapshot).toMatchObject({
      employerName: "Sunrise Residence",
      hourlyRate: { amountMinor: 5000, currency: "CAD" },
      title: "Emergency Chef"
    });
    expect("description" in snapshot).toBe(false);
  });
});
