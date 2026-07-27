import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (...path: string[]) => readFileSync(join(root, ...path), "utf8");

describe("authenticated calendar UI integration", () => {
  it("connects employer and admin lists to same-origin BFF routes", () => {
    const employer = read("apps", "employer", "app", "employer", "calendar", "ClientCalendarPanel.tsx");
    const admin = read("apps", "admin", "app", "calendar", "AdminCalendarPanel.tsx");
    for (const source of [employer, admin]) {
      expect(source).toContain('fetch("/api/calendar/requests"');
      expect(source).toContain('fetch("/api/session/sign-in"');
      expect(source).toContain("clearWebCalendarSession(fetch)");
      expect(source).not.toMatch(/Bearer\s|authorization\s*:/iu);
      expect(source).not.toMatch(/localStorage|sessionStorage/u);
    }
  });

  it("routes persisted list records to the matching persisted detail", () => {
    const employerList = read("apps", "employer", "app", "employer", "calendar", "ClientCalendarPanel.tsx");
    const employerDetail = read("apps", "employer", "app", "employer", "calendar", "request", "ClientRequestDetailPanel.tsx");
    const adminList = read("apps", "admin", "app", "calendar", "AdminCalendarPanel.tsx");
    const adminDetail = read("apps", "admin", "app", "calendar", "PersistedAdminReviewPanel.tsx");
    expect(employerList).toContain("request.requestNumber");
    expect(employerDetail).toContain("encodeURIComponent(requestId)");
    expect(employerDetail).toContain("organization_required");
    expect(adminList).toContain("request.requestNumber");
    expect(adminDetail).toContain("encodeURIComponent(requestId)");
  });

  it("never substitutes fixtures when authenticated data is denied, empty, or unavailable", () => {
    const sources = [
      read("apps", "employer", "app", "employer", "calendar", "ClientCalendarPanel.tsx"),
      read("apps", "employer", "app", "employer", "calendar", "request", "ClientRequestDetailPanel.tsx"),
      read("apps", "admin", "app", "calendar", "AdminCalendarPanel.tsx"),
      read("apps", "admin", "app", "calendar", "PersistedAdminReviewPanel.tsx"),
      read("apps", "mobile", "src", "features", "worker-calendar", "WorkerCalendarPanel.tsx")
    ].join("\n");
    expect(sources).not.toMatch(/workerOfferCalendarFixture|workerConfirmedCalendarFixture|clientCalendarRows|adminCalendarRequests/u);
    expect(sources).toContain("No fixture");
  });

  it("keeps the worker offer path secure and read-only", () => {
    const app = read("apps", "mobile", "App.tsx");
    const panel = read("apps", "mobile", "src", "features", "worker-calendar", "WorkerCalendarPanel.tsx");
    expect(app).toContain("nativeSecureSessionVault");
    expect(app).toContain("EXPO_PUBLIC_RWOS_API_ORIGIN");
    expect(panel).toContain("transport.workerOffer(offerId)");
    expect(panel).toContain("Accept and decline are unavailable");
    expect(panel).toContain("transport.signOut()");
    expect(panel).toContain("cannot execute attendance");
    expect(panel).not.toMatch(/workerOfferCalendarFixture|workerConfirmedCalendarFixture/u);
  });

  it("keeps persisted assignment continuity honest until its read API is authorized", () => {
    const employerAssignment = read("apps", "employer", "app", "employer", "calendar", "assignment", "page.tsx");
    const adminAssignment = read("apps", "admin", "app", "calendar", "assignment", "page.tsx");
    expect(employerAssignment).toContain("No fixture worker is substituted");
    expect(adminAssignment).toContain("No fixture assignment is substituted");
    expect(`${employerAssignment}\n${adminAssignment}`).toContain("Attendance");
    expect(`${employerAssignment}\n${adminAssignment}`).not.toMatch(/executeAttendance|punchIn|punchOut/u);
  });

  it("keeps approved fixture previews reachable without mixing them into persisted records", () => {
    const createPage = read("apps", "employer", "app", "employer", "calendar", "create", "page.tsx");
    const clientRequestPage = read("apps", "employer", "app", "employer", "calendar", "request", "page.tsx");
    const adminRequestPage = read("apps", "admin", "app", "calendar", "request", "page.tsx");
    const adminCalendarPage = read("apps", "admin", "app", "calendar", "page.tsx");
    const workerPanel = read("apps", "mobile", "src", "features", "worker-calendar", "WorkerCalendarPanel.tsx");
    const workerFixture = read("apps", "mobile", "src", "features", "worker-calendar", "WorkerCalendarFixturePreview.tsx");

    expect(createPage).toContain("/employer/calendar/request?mode=fixture");
    expect(clientRequestPage).toContain('mode === "fixture" && !request');
    expect(adminRequestPage).toContain("request");
    expect(adminRequestPage).toContain("<AdminReviewPanel />");
    expect(adminCalendarPage).toContain('href="/calendar/request"');
    expect(adminCalendarPage).toContain("fixture review-controls preview");
    expect(workerPanel).toContain("Open isolated fixture workflow preview");
    expect(workerPanel).toContain('state.status === "unavailable"');
    expect(workerFixture).toContain("Accept fixture offer");
    expect(workerFixture).toContain("Attendance handoff only");
    expect(workerFixture).toContain("not persisted");
  });
});
