import { describe, expect, it } from "vitest";
import {
  activeShiftIssues,
  aiSupportBoundary,
  attachmentWarnings,
  contactPaths,
  escalationTimeline,
  generalReasons,
  immediateActions
} from "./contactContent";

const contactCopy = [
  ...contactPaths.flatMap((path) => [path.title, path.text]),
  ...activeShiftIssues,
  ...immediateActions,
  ...escalationTimeline,
  ...generalReasons,
  ...attachmentWarnings,
  ...aiSupportBoundary
].join(" ");

describe("Page 005 contact content", () => {
  it("separates active-shift support from general contact", () => {
    expect(contactPaths.map((path) => path.title)).toEqual([
      "Help with an active shift",
      "General contact"
    ]);
    expect(activeShiftIssues).toContain("Replacement needed");
    expect(generalReasons).toContain("Privacy request");
  });

  it("keeps support actions as routing placeholders", () => {
    expect(immediateActions).toContain("Request replacement");
    expect(escalationTimeline).toEqual([
      "Submitted",
      "Triage in progress",
      "Assigned to support",
      "Action being coordinated",
      "Resolved or closed"
    ]);
  });

  it("protects privacy and attachment boundaries", () => {
    expect(attachmentWarnings).toContain("Do not upload full banking details.");
    expect(attachmentWarnings).toContain("Do not upload unnecessary health records.");
  });

  it("keeps AI advisory and prevents automated support resolution", () => {
    expect(aiSupportBoundary).toContain("AI may classify the issue.");
    expect(aiSupportBoundary).toContain(
      "AI must not assign a replacement without authorized confirmation."
    );
    expect(aiSupportBoundary).toContain("AI must not close a dispute or claim the issue is resolved.");
  });

  it("does not fabricate contact proof or country-specific emergency details", () => {
    expect(contactCopy).not.toMatch(/911|999|response within|24\/7|guaranteed/i);
    expect(contactCopy).not.toMatch(/Canada|Syria|province|state law/i);
  });
});

