import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// @ts-expect-error The v1 contract-kit helper is intentionally distributed as JavaScript.
import { findLeakedEconomicsKeys } from "../../contracts/security/economicsLeak.mjs";
import {
  adminAiRecommendation,
  adminAssignmentVisibility,
  adminCalendarEvent,
  adminReviewActions
} from "../../apps/admin/app/calendar/adminCalendarContent";
import {
  clientAssignmentVisibility,
  clientCalendarEvent,
  clientCalendarPrimaryLinks
} from "../../apps/employer/app/employer/calendar/clientCalendarContent";
import {
  workerAttendanceHandoff,
  workerConfirmedCalendarFixture,
  workerOfferCalendarFixture
} from "../../apps/mobile/src/features/worker-calendar/workerCalendarContent";
import { mobileRouteNames } from "../../apps/mobile/src/navigation/routes";

const root = process.cwd();

const connectedWorkflow = [
  "client_request_calendar",
  "client_create_request",
  "client_request_detail",
  "admin_review_calendar",
  "admin_request_review",
  "published_worker_offer",
  "worker_response",
  "assignment_visibility",
  "attendance_handoff"
] as const;

const employerRoutes = [
  "/employer/calendar",
  "/employer/calendar/create",
  "/employer/calendar/request",
  "/employer/calendar/assignment"
] as const;

const adminRoutes = ["/calendar", "/calendar/request", "/calendar/assignment"] as const;

function pagePath(app: "admin" | "employer", route: string) {
  return join(root, "apps", app, "app", route.slice(1), "page.tsx");
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory()
      ? sourceFiles(path)
      : /\.(ts|tsx)$/.test(entry)
        ? [path]
        : [];
  });
}

describe("Connected Calendar Workflow integrity", () => {
  it("keeps every approved workflow stage represented in order", () => {
    expect(connectedWorkflow).toEqual([
      "client_request_calendar",
      "client_create_request",
      "client_request_detail",
      "admin_review_calendar",
      "admin_request_review",
      "published_worker_offer",
      "worker_response",
      "assignment_visibility",
      "attendance_handoff"
    ]);
  });

  it("implements every client and admin route in the connected path", () => {
    expect(employerRoutes.map((route) => existsSync(pagePath("employer", route)))).toEqual([
      true,
      true,
      true,
      true
    ]);
    expect(adminRoutes.map((route) => existsSync(pagePath("admin", route)))).toEqual([
      true,
      true,
      true
    ]);
    expect(mobileRouteNames.calendar).toBe("rwos://worker/calendar");
    expect(readFileSync(join(root, "apps/mobile/App.tsx"), "utf8")).toContain(
      "<WorkerCalendarPanel />"
    );
  });

  it("keeps primary client actions connected and admin controls locally truthful", () => {
    expect(clientCalendarPrimaryLinks).toEqual([
      expect.objectContaining({ from: "/employer/calendar", to: "/employer/calendar/create" }),
      expect.objectContaining({
        from: "/employer/calendar/create",
        to: "/employer/calendar/request"
      }),
      expect.objectContaining({
        from: "/employer/calendar/request",
        to: "/employer/calendar/assignment"
      }),
      expect.objectContaining({
        from: "/employer/calendar/assignment",
        to: "/employer/calendar"
      })
    ]);
    expect(adminReviewActions).toEqual([
      "approve",
      "reject",
      "return",
      "publish",
      "pause",
      "cancel",
      "reprice"
    ]);
    expect(adminAiRecommendation.authority).toBe("advisory_only");
  });

  it("preserves client, worker, and admin economics boundaries", () => {
    expect(
      findLeakedEconomicsKeys(clientCalendarEvent, [
        "workerEconomics",
        "workerHourlyRate",
        "platformMargin",
        "internalAdminPricing"
      ])
    ).toEqual([]);
    expect(
      findLeakedEconomicsKeys(workerOfferCalendarFixture, [
        "clientEconomics",
        "billRate",
        "platformMargin",
        "paymentMethod",
        "internalAdminNotes"
      ])
    ).toEqual([]);
    expect(adminCalendarEvent.clientEconomics).toBeDefined();
    expect(adminCalendarEvent.workerOfferEconomics).toBeDefined();
    expect(adminCalendarEvent.clientEconomics).not.toBe(
      adminCalendarEvent.workerOfferEconomics
    );
  });

  it("limits assignment identity and ends at attendance handoff", () => {
    expect(clientAssignmentVisibility.assignedWorker).toEqual({
      displayName: "Amina K.",
      roleLabel: "Personal Support Worker"
    });
    expect(workerConfirmedCalendarFixture.status).toBe("confirmed");
    expect(adminAssignmentVisibility.attendance).toEqual({
      authority: "handoff_only",
      execution: "not_started"
    });
    expect(workerAttendanceHandoff).toMatchObject({
      authority: "handoff_only",
      attendanceExecution: "not_started"
    });
  });

  it("contains no backend, payroll, payment, notification, map, or attendance execution", () => {
    const calendarSources = [
      ...sourceFiles(join(root, "apps/employer/app/employer/calendar")),
      ...sourceFiles(join(root, "apps/admin/app/calendar")),
      ...sourceFiles(join(root, "apps/mobile/src/features/worker-calendar"))
    ];
    const executablePatterns = [
      /\bfetch\s*\(/u,
      /\bprisma\./u,
      /\/api\//u,
      /\bstripe\b/iu,
      /\bcalculatePayroll\b/u,
      /\bexecutePayment\b/u,
      /\bsendNotification\b/u,
      /\bmapbox\b/iu,
      /\bgoogleMaps\b/iu,
      /\bpunchIn\b/u,
      /\bpunchOut\b/u
    ];
    const violations = calendarSources.flatMap((file) => {
      const source = readFileSync(file, "utf8");
      return executablePatterns
        .filter((pattern) => pattern.test(source))
        .map((pattern) => `${file}:${pattern.source}`);
    });

    expect(violations).toEqual([]);
  });
});
