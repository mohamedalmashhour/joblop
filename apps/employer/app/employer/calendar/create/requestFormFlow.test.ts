import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { prefillSiteAddress, submittedConfirmation } from "./requestFormFlow";

const form = {
  title: "  Farm help  ",
  startAt: "2026-11-12T10:00",
  endAt: "2026-11-12T16:00",
  numberOfWorkers: "2",
  addressSummary: "901 Avenue du Parc, Laval"
};

describe("submittedConfirmation", () => {
  it("keeps the form while the request is not sent yet", () => {
    for (const status of ["editing", "review", "draft", "saving", "submitting"]) {
      expect(submittedConfirmation({ status, draft: { jobRequestNumber: "JR-1" }, form, shiftCount: 1 })).toBeNull();
    }
  });

  it("replaces the form with a summary and the three next steps once sent", () => {
    expect(submittedConfirmation({ status: "submitted", draft: { jobRequestNumber: "JR-2026-0042" }, form, shiftCount: 1 })).toEqual({
      requestNumber: "JR-2026-0042",
      openRequestHref: "/employer/calendar/request?request=JR-2026-0042",
      title: "Farm help",
      startAt: "2026-11-12T10:00",
      endAt: "2026-11-12T16:00",
      workers: 2,
      address: "901 Avenue du Parc, Laval",
      shiftCount: 1,
      requestMoreHref: "/employer/calendar/create",
      backToCalendarHref: "/employer/calendar"
    });
  });

  it("still confirms when the number is unknown, without an Open request link", () => {
    const confirmation = submittedConfirmation({ status: "submitted", draft: null, form: { ...form, addressSummary: " ", numberOfWorkers: "x" }, shiftCount: 0 });
    expect(confirmation).toMatchObject({ requestNumber: null, openRequestHref: null, address: null, workers: 1, shiftCount: 1 });
  });

  it("is what the form renders after Submit for review, with no second Submit button", () => {
    const panel = readFileSync(join(__dirname, "CreatePersistedRequestPanel.tsx"), "utf8");
    expect(panel).toContain("const confirmation = submittedConfirmation(");
    expect(panel).toContain("<SubmittedView");
    expect(panel).toContain('t("create.requestMore")');
    // The old banner-over-the-filled-form state is gone: "submitted" no longer counts as an editable success.
    expect(panel).toContain('const succeeded = status === "draft";');
  });
});

describe("prefillSiteAddress", () => {
  it("fills an empty Site address from the chosen location", () => {
    expect(prefillSiteAddress("", null, "901 Avenue du Parc, Laval")).toEqual({ address: "901 Avenue du Parc, Laval", filled: "901 Avenue du Parc, Laval" });
  });

  it("follows a new location when the address was filled by the form", () => {
    expect(prefillSiteAddress("A St", "A St", "B St")).toEqual({ address: "B St", filled: "B St" });
    expect(prefillSiteAddress("A St", "A St", null)).toEqual({ address: "", filled: null });
  });

  it("never replaces an address the employer typed", () => {
    expect(prefillSiteAddress("Back door, 5 Rue X", "A St", "B St")).toEqual({ address: "Back door, 5 Rue X", filled: "A St" });
    expect(prefillSiteAddress("Typed", null, "B St")).toEqual({ address: "Typed", filled: null });
  });

  it("leaves the box empty when the location has no address on file", () => {
    expect(prefillSiteAddress("", null, null)).toEqual({ address: "", filled: null });
  });
});
