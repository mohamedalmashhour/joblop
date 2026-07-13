import { describe, expect, it } from "vitest";
import { shiftDiscoveryRecordSchema, workerIdentitySchema } from "./index";

const workerFixture = {
  id: "worker_001",
  firstName: "Amina",
  lastName: "B.",
  displayName: "Amina B.",
  email: "amina@example.test",
  phone: "+15145550100",
  preferredLanguage: "fr",
  profilePhotoUrl: null,
  city: "Montreal",
  province: "QC",
  country: "CA",
  workEligibilityStatus: "verified",
  profileCompletionPercent: 86,
  verificationStatus: "verified",
  createdAt: "2026-07-13T10:00:00.000Z",
  updatedAt: "2026-07-13T11:00:00.000Z"
} as const;

const shiftFixture = {
  id: "shift_001",
  employerId: "employer_001",
  employerName: "Sunrise Residence",
  employerRating: 4.8,
  title: "Emergency Chef",
  category: "kitchen",
  description: "Prepare lunch and dinner service for a senior residence.",
  duties: ["Review menu", "Prepare hot meal service", "Leave end-of-shift notes"],
  city: "Montreal",
  province: "QC",
  country: "CA",
  addressSummary: "Rosemont area",
  latitude: 45.557,
  longitude: -73.579,
  distanceKm: 5.2,
  startAt: "2026-07-14T10:00:00.000Z",
  endAt: "2026-07-14T18:00:00.000Z",
  hourlyRate: { amountMinor: 5000, currency: "CAD" },
  currency: "CAD",
  estimatedTotal: { amountMinor: 40000, currency: "CAD" },
  requiredExperienceYears: 3,
  requiredCertifications: ["Food safety"],
  requiredLanguages: ["fr", "en"],
  dressCode: "Kitchen whites and non-slip shoes.",
  breakPolicy: "Break coordinated with the residence supervisor.",
  cancellationPolicy: "Emergency shifts require dispatcher review before cancellation.",
  applicationDeadline: "2026-07-14T09:00:00.000Z",
  status: "open",
  urgency: "immediate",
  createdAt: "2026-07-13T10:00:00.000Z",
  updatedAt: "2026-07-13T10:30:00.000Z"
} as const;

describe("worker identity validation", () => {
  it("accepts the G01 worker identity contract", () => {
    expect(workerIdentitySchema.parse(workerFixture)).toMatchObject({
      id: "worker_001",
      verificationStatus: "verified"
    });
  });

  it("rejects invalid worker enum values", () => {
    expect(() =>
      workerIdentitySchema.parse({ ...workerFixture, verificationStatus: "approved" })
    ).toThrow();
  });
});

describe("shift discovery validation", () => {
  it("accepts the G01 shift discovery contract", () => {
    expect(shiftDiscoveryRecordSchema.parse(shiftFixture)).toMatchObject({
      id: "shift_001",
      urgency: "immediate"
    });
  });

  it("rejects invalid money values", () => {
    expect(() =>
      shiftDiscoveryRecordSchema.parse({
        ...shiftFixture,
        hourlyRate: { amountMinor: 50.25, currency: "CAD" }
      })
    ).toThrow();
  });

  it("rejects invalid date ranges", () => {
    expect(() =>
      shiftDiscoveryRecordSchema.parse({
        ...shiftFixture,
        endAt: "2026-07-14T08:00:00.000Z"
      })
    ).toThrow();
  });

  it("rejects invalid status values", () => {
    expect(() => shiftDiscoveryRecordSchema.parse({ ...shiftFixture, status: "available" })).toThrow();
  });
});
