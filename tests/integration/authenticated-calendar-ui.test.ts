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
    // Staff pages use the one shared signed-out block (gold Sign in button with a return path).
    expect(admin).toContain("<SignedOut");
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
    // "Edit draft" reuses the full Request workers form, pre-filled with the saved draft.
    const page = read("apps", "employer", "app", "employer", "calendar", "request", "edit", "page.tsx");
    const editor = read(
      "apps",
      "employer",
      "app",
      "employer",
      "calendar",
      "create",
      "CreatePersistedRequestPanel.tsx"
    );
    for (const source of [list, detail]) {
      expect(source).toContain('request.status === "draft"');
      expect(source).toContain("/employer/calendar/request/edit");
    }
    expect(page).toContain("<CreatePersistedRequestPanel editRequestId={id} />");
    expect(editor).toContain('const EDITABLE_STATUSES = ["draft", "information_required"]');
    expect(editor).toContain('method: "PATCH"');
    expect(editor).toContain("expectedVersion: current.versionToken");
    expect(editor).toContain('t("create.msgDraftChanged")');
    expect(editor).toContain('t("create.submitForReview")');
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
    const reviewCopy = read("apps", "admin", "app", "calendar", "reviewText.ts");
    // No separate "Start review" button any more: approval is one step.
    expect(reviewCopy).not.toContain("beginReview");
    expect(review).not.toContain("t.beginReview");
    expect(reviewCopy).toContain("Send question to employer");
    expect(reviewCopy).toContain("Post on the job board (first qualified worker gets it)");
    expect(reviewCopy).toContain("I'll choose the worker myself");
    expect(reviewCopy).toContain("Question for the employer (only if you need more details)");
    // One-step approval: a new request is moved to review with the existing begin-review action
    // first (audit trail unchanged), then approved or questioned with the version it returned.
    expect(review).toContain("let expectedVersion: number = request.versionToken");
    expect(review).toContain('post("admin-review", expectedVersion)');
    expect(review).toContain("expectedVersion = next");
    expect(review).toContain("setConfirmAction(");
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
    }
    // The calendar card and the request detail are translated (EN / FR / AR).
    expect(detail).toContain('t("calendar.provideInfo")');
    expect(list).toContain('t("calendar.provideInfo")');
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
    // The employer words live in staffingText.ts (en/fr/ar). They stay honest in plain language: a
    // failed load changes nothing, and "zero places left" does not mean workers have confirmed.
    const employerStaffingText = read(
      "apps",
      "employer",
      "app",
      "employer",
      "calendar",
      "assignment",
      "staffingText.ts"
    );
    expect(employerAssignment).toContain("staffingText[await serverLang()]");
    expect(employerStaffingText).toContain('pageTitle: "Staffing progress"');
    expect(employerStaffingPanel).toContain("tx.zeroNote");
    expect(employerStaffingText).toContain("Your request was not changed.");
    expect(employerStaffingText).toContain("You will see them on Assigned workers once they confirm.");
    expect(employerStaffingText).not.toMatch(/fixture|persisted|dispatch|authoritative/iu);
    expect(adminAssignment).toContain("No fixture assignment is substituted");
    expect(adminAssignment).toContain("Attendance");
    const adminReview = read("apps", "admin", "app", "calendar", "PersistedAdminReviewPanel.tsx");
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
    expect(adminRequestPage).toContain("Choose a request");
    expect(adminRequestPage).not.toContain("<AdminReviewPanel />");
    expect(adminCalendarPage).not.toContain("fixture review-controls preview");
    expect(workerPanel).toContain("Open isolated fixture workflow preview");
    expect(workerPanel).toContain('state.status === "unavailable"');
    expect(workerFixture).toContain("Accept fixture offer");
    expect(workerFixture).toContain("Attendance handoff only");
    expect(workerFixture).toContain("not persisted");
  });
});
