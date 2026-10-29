import { describe, expect, it } from "vitest";
import { assignmentStatusLabel, assignmentStatusTone, interestStatusLabel, interestStatusTone } from "./myWorkContent";

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
});
