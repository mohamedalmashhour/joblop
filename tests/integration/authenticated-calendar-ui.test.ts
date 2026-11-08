import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (...path: string[]) => readFileSync(join(root, ...path), "utf8");

describe("authenticated calendar UI integration", () => {
  it("keeps synthetic landing previews outside production and labels them in development", () => {
    const landing = read("apps", "employer", "app", "page.tsx");
    expect(landing).toContain('process.env.RWOS_ENV === "production"');
    // Preview band is gated out of production and labelled as illustrative synthetic data.
    expect(landing).toContain("!isProduction");
    // The illustrative-data label lives in the bilingual landing copy and is rendered in the band.
    const landingContent = read("apps", "employer", "app", "landingContent.ts");
    expect(landing).toContain("{c.preview.copy}");
    expect(landingContent).toContain("Sample data shown for illustration.");
    expect(landingContent).toContain("Données d’exemple présentées à titre indicatif.");
  });

  it("connects employer and admin lists to same-origin BFF routes", () => {
    const employer = read(
      "apps",
      "employer",
      "app",
      "employer",
      "calendar",
      "ClientCalendarPanel.tsx"
    );
    const admin = read("apps", "admin", "app", "calendar", "AdminCalendarPanel.tsx");
    for (const source of [employer, admin]) {
      expect(source).toContain('fetch("/api/calendar/requests"');
      expect(source).toContain("clearWebCalendarSession(fetch)");
      expect(source).not.toMatch(/Bearer\s|authorization\s*:/iu);
      expect(source).not.toMatch(/localStorage|sessionStorage/u);
    }
    expect(admin).toContain('href="/signin"');
    expect(employer).toContain('href="/signin"');
  });

  it("routes persisted list records to the matching persisted detail", () => {
    const employerList = read(
      "apps",
      "employer",
      "app",
      "employer",
      "calendar",
      "ClientCalendarPanel.tsx"
    );
    const employerDetail = read(
      "apps",
      "employer",
      "app",
      "employer",
      "calendar",
      "request",
      "ClientRequestDetailPanel.tsx"
    );
    const adminList = read("apps", "admin", "app", "calendar", "AdminCalendarPanel.tsx");
    const adminDetail = read("apps", "admin", "app", "calendar", "PersistedAdminReviewPanel.tsx");
    expect(employerList).toContain("request.requestNumber");
    expect(employerDetail).toContain("encodeURIComponent(requestId)");
    expect(employerDetail).toContain("organization_required");
    expect(adminList).toContain("request.requestNumber");
    expect(adminDetail).toContain("encodeURIComponent(requestId)");
  });

  it("exposes versioned editing only for editable persisted request states", () => {
    const list = read("apps", "employer", "app", "employer", "calendar", "ClientCalendarPanel.tsx");
    const detail = read(
      "apps",
      "employer",
      "app",
      "employer",
      "calendar",
      "request",
      "ClientRequestDetailPanel.tsx"
    );
    const editor = read(
      "apps",
      "employer",
      "app",
      "employer",
      "calendar",
      "request",
      "edit",
      "EditPersistedRequestPanel.tsx"
    );
    for (const source of [list, detail]) {
      expect(source).toContain('request.status === "draft"');
      expect(source).toContain("/employer/calendar/request/edit");
    }
    expect(editor).toContain('status === "information_required"');
    expect(editor).toContain('method: "PATCH"');
    expect(editor).toContain("expectedVersion: snapshot.versionToken");
    expect(editor).toContain("This draft changed after you opened it");
    expect(editor).toContain("Load latest version");
    expect(editor).toContain("Resubmit for admin review");
  });

  it("connects persisted admin intake actions without enabling downstream execution", () => {
    const review = read("apps", "admin", "app", "calendar", "PersistedAdminReviewPanel.tsx");
    const mutation = read(
      "apps",
      "admin",
      "app",
      "api",
      "intake",
      "[jobRequestId]",
      "[action]",
      "route.ts"
    );
    expect(review).toContain("Begin admin review");
    expect(review).toContain("Request information");
    expect(review).toContain("Approve for dispatch");
    expect(review).toContain("expectedVersion: request.versionToken");
    expect(review).toContain("does not publish, assign, notify");
    expect(mutation).toContain("isSameOriginMutation(request)");
    expect(mutation).toContain("readAdminIntakeMutation");
    expect(mutation).toContain('"cache-control": "private, no-store"');
  });

  it("shows employers only the safe requested-information reason and correction handoff", () => {
    const list = read("apps", "employer", "app", "employer", "calendar", "ClientCalendarPanel.tsx");
    const detail = read(
      "apps",
      "employer",
      "app",
      "employer",
      "calendar",
      "request",
      "ClientRequestDetailPanel.tsx"
    );
    for (const source of [list, detail]) {
      expect(source).toContain('actionRequired === "information_required"');
      expect(source).toContain("actionRequiredReason");
      expect(source).toContain("Provide requested information");
    }
  });

  it("never substitutes fixtures when authenticated data is denied, empty, or unavailable", () => {
    const sources = [
      read("apps", "employer", "app", "employer", "calendar", "ClientCalendarPanel.tsx"),
      read(
        "apps",
        "employer",
        "app",
        "employer",
        "calendar",
        "request",
        "ClientRequestDetailPanel.tsx"
      ),
      read("apps", "admin", "app", "calendar", "AdminCalendarPanel.tsx"),
      read("apps", "admin", "app", "calendar", "PersistedAdminReviewPanel.tsx"),
      read("apps", "mobile", "src", "features", "worker-calendar", "WorkerCalendarPanel.tsx")
    ].join("\n");
    expect(sources).not.toMatch(
      /workerOfferCalendarFixture|workerConfirmedCalendarFixture|clientCalendarRows|adminCalendarRequests/u
    );
    expect(sources).toContain("No fixture");
  });

  it("keeps the worker offer path secure and read-only", () => {
    const app = read("apps", "mobile", "App.tsx");
    const panel = read(
      "apps",
      "mobile",
      "src",
      "features",
      "worker-calendar",
      "WorkerCalendarPanel.tsx"
    );
    expect(app).toContain("nativeSecureSessionVault");
    expect(app).toContain("EXPO_PUBLIC_RWOS_API_ORIGIN");
    expect(panel).toContain("transport.workerOffer(selectedOfferId)");
    expect(panel).toContain("transport.workerOffers()");
    expect(panel).toContain("transport.respondToWorkerOffer");
    expect(panel).toContain("Offer responses are not enabled in this environment");
    expect(panel).toContain("transport.signOut()");
    expect(panel).toContain("cannot execute attendance");
    expect(panel).not.toMatch(/workerOfferCalendarFixture|workerConfirmedCalendarFixture/u);
  });

  it("keeps persisted assignment continuity honest until its read API is authorized", () => {
    const employerAssignment = read(
      "apps",
      "employer",
      "app",
      "employer",
      "calendar",
      "assignment",
      "page.tsx"
    );
    const employerStaffingPanel = read(
      "apps",
      "employer",
      "app",
      "employer",
      "calendar",
      "assignment",
      "StaffingProgressPanel.tsx"
    );
    const adminAssignment = read("apps", "admin", "app", "calendar", "assignment", "page.tsx");
    expect(employerAssignment).toContain("Staffing progress");
    expect(employerStaffingPanel).toContain("No fixture status or worker identity is substituted");
    expect(employerStaffingPanel).toContain("does not confirm accepted offers or assignments");
    expect(adminAssignment).toContain("No fixture assignment is substituted");
    expect(adminAssignment).toContain("Attendance");
    const adminReview = read("apps", "admin", "app", "calendar", "PersistedAdminReviewPanel.tsx");
    expect(adminReview).toContain("Assignment records are not connected in this admin view");
    expect(adminReview).not.toContain("/calendar/assignment?request=");
    expect(`${employerAssignment}\n${employerStaffingPanel}\n${adminAssignment}`).not.toMatch(
      /executeAttendance|punchIn|punchOut/u
    );
  });

  it("uses persisted employer creation while keeping isolated admin and worker previews honest", () => {
    const createPage = read(
      "apps",
      "employer",
      "app",
      "employer",
      "calendar",
      "create",
      "page.tsx"
    );
    const createPanel = read(
      "apps",
      "employer",
      "app",
      "employer",
      "calendar",
      "create",
      "CreatePersistedRequestPanel.tsx"
    );
    const clientRequestPage = read(
      "apps",
      "employer",
      "app",
      "employer",
      "calendar",
      "request",
      "page.tsx"
    );
    const adminRequestPage = read("apps", "admin", "app", "calendar", "request", "page.tsx");
    const adminCalendarPage = read("apps", "admin", "app", "calendar", "page.tsx");
    const workerPanel = read(
      "apps",
      "mobile",
      "src",
      "features",
      "worker-calendar",
      "WorkerCalendarPanel.tsx"
    );
    const workerFixture = read(
      "apps",
      "mobile",
      "src",
      "features",
      "worker-calendar",
      "WorkerCalendarFixturePreview.tsx"
    );

    expect(createPage).toContain("<CreatePersistedRequestPanel />");
    expect(createPage).toContain('mode="authenticated"');
    expect(createPanel).toContain('fetch("/api/job-requests"');
    // Copy lives in the bilingual employer catalogue; the panel references it by key.
    const employerMessages = read("apps", "employer", "app", "i18n", "messages.ts");
    expect(createPanel).toContain('t("create.reviewTitle")');
    expect(employerMessages).toContain('"create.reviewTitle": "Review staffing request"');
    expect(employerMessages).toContain('"Review request"');
    expect(createPanel).toContain('method: "PUT"');
    expect(createPanel).toContain('t("create.retryDetails")');
    expect(employerMessages).toContain('"create.retryDetails": "Retry staffing details"');
    // The rate note points at the approved contract and never mentions the worker's rate or a share.
    expect(createPanel).toContain('t("create.economicsNote")');
    expect(employerMessages).toContain("follow your approved contract");
    expect(employerMessages).not.toMatch(/worker's rate is set|worker's share|hourly share|platform margin/i);
    expect(createPanel).toContain("/submit");
    expect(createPanel).not.toContain("mode=fixture");
    expect(clientRequestPage).toContain('mode === "fixture" && !request');
    expect(adminRequestPage).toContain("request");
    expect(adminRequestPage).toContain("Select a persisted request");
    expect(adminRequestPage).not.toContain("<AdminReviewPanel />");
    expect(adminCalendarPage).not.toContain("fixture review-controls preview");
    expect(workerPanel).toContain("Open isolated fixture workflow preview");
    expect(workerPanel).toContain('state.status === "unavailable"');
    expect(workerFixture).toContain("Accept fixture offer");
    expect(workerFixture).toContain("Attendance handoff only");
    expect(workerFixture).toContain("not persisted");
  });
});
