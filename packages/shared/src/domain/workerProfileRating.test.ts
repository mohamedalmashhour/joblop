import { describe, expect, it } from "vitest";
import { workerProfileRating } from "./workerProfileRating";

const doc = (documentType: string, effectiveStatus = "submitted") => ({ documentType, effectiveStatus });

describe("worker profile rating", () => {
  it("starts a worker with no documents at the lowest tier", () => {
    expect(workerProfileRating([])).toMatchObject({ score: 0, tier: "starter", jobLimit: 10 });
  });

  it("raises the rating and job limit as documents are added", () => {
    expect(workerProfileRating([doc("identity"), doc("photo")])).toMatchObject({ score: 50, tier: "good", jobLimit: 25 });
    expect(workerProfileRating([doc("identity"), doc("photo"), doc("cv")])).toMatchObject({ score: 70, tier: "strong", jobLimit: 50 });
  });

  it("shows every job at a complete profile", () => {
    const all = ["identity", "photo", "cv", "work_authorization", "certificate"].map((type) => doc(type));
    expect(workerProfileRating(all)).toMatchObject({ score: 100, tier: "top", jobLimit: null });
  });

  it("counts duplicates once and any qualifying certificate", () => {
    expect(workerProfileRating([doc("cv"), doc("cv"), doc("first_aid"), doc("licence")]).score).toBe(30);
  });

  it("ignores documents that are no longer live", () => {
    for (const status of ["rejected", "expired", "revoked", "superseded"]) {
      expect(workerProfileRating([doc("identity", status)]).score).toBe(0);
    }
    expect(workerProfileRating([doc("identity", "accepted"), doc("cv", "expiring")]).score).toBe(50);
  });
});
