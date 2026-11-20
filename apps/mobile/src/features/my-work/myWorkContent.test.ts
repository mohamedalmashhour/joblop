import { describe, expect, it } from "vitest";
import {
  assignmentStatusLabel,
  assignmentStatusTone,
  interestStatusLabel,
  interestStatusTone,
  myWorkCopyFor
} from "./myWorkContent";

describe("my-work status mapping", () => {
  it("labels + tones interest statuses (and passes through unknowns)", () => {
    expect(interestStatusLabel("offer_created")).toBe("Offer sent to you");
    expect(interestStatusTone("offer_created")).toBe("success");
    expect(interestStatusLabel("not_selected")).toBe("Not selected");
    expect(interestStatusTone("not_selected")).toBe("danger");
    expect(interestStatusLabel("mystery")).toBe("mystery");
    expect(interestStatusTone("mystery")).toBe("neutral");
  });

  it("labels + tones assignment statuses", () => {
    expect(assignmentStatusLabel("confirmed")).toBe("Confirmed");
    expect(assignmentStatusTone("confirmed")).toBe("success");
    expect(assignmentStatusLabel("employer_cancelled")).toBe("Cancelled");
    expect(assignmentStatusTone("employer_cancelled")).toBe("danger");
    expect(assignmentStatusLabel("in_attendance_window")).toBe("In progress");
  });

  it("localizes labels (FR/AR) and falls back to English for unknown locales/statuses", () => {
    expect(interestStatusLabel("offer_created", "fr")).toBe("Offre qui vous a été envoyée");
    expect(interestStatusLabel("offer_created", "ar")).toBe("عرض مُرسَل إليك");
    expect(assignmentStatusLabel("confirmed", "fr")).toBe("Confirmé");
    expect(assignmentStatusLabel("confirmed", "ar")).toBe("مؤكَّد");
    // Unknown status still passes through in any locale.
    expect(interestStatusLabel("mystery", "ar")).toBe("mystery");
  });

  it("exposes trilingual screen copy via myWorkCopyFor", () => {
    expect(myWorkCopyFor("en").title).toBe("My shifts");
    expect(myWorkCopyFor("fr").title).toBe("Mes quarts");
    expect(myWorkCopyFor("ar").title).toBe("فرص عملي");
  });
});
