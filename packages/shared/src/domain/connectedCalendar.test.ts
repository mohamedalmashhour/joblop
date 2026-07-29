import { describe, expect, it } from "vitest";

// @ts-expect-error The imported v1 contract-kit helper is intentionally distributed as JavaScript.
import { findLeakedEconomicsKeys } from "../../../../contracts/security/economicsLeak.mjs";
import {
  createConnectedCalendarViews,
  type ConnectedCalendarFixture
} from "./connectedCalendar";

const fixture: ConnectedCalendarFixture = {
  request: {
    id: "request_001",
    organizationId: "org_001",
    clientDisplayName: "Harbour Residence",
    roleLabel: "Personal Support Worker",
    requestedWorkerCount: 1,
    startsAt: "2026-08-03T12:00:00.000Z",
    endsAt: "2026-08-03T20:00:00.000Z",
    timezone: "America/Toronto",
    locationSummary: "Harbour Residence, Toronto",
    dutiesSummary: "Support the evening resident-care routine.",
    qualifications: ["PSW certificate"],
    status: "submitted"
  },
  adminReview: {
    status: "approved",
    contractReadiness: "confirmed",
    paymentMethodReadiness: "verified",
    internalAdminNotes: "Publish to the approved PSW eligibility group."
  },
  publication: {
    offerId: "offer_001",
    status: "published_to_workers",
    publishedAt: "2026-07-27T14:00:00.000Z",
    clientEconomics: {
      billRate: { amountMinor: 4500, currency: "CAD" },
      termsVersion: "client-terms-v1"
    },
    workerOfferEconomics: {
      hourlyRate: { amountMinor: 3000, currency: "CAD" },
      transportationCompensation: { amountMinor: 500, currency: "CAD" },
      termsVersion: "worker-terms-v1"
    }
  },
  workerResponse: {
    workerId: "worker_001",
    status: "accepted",
    respondedAt: "2026-07-27T14:30:00.000Z"
  },
  assignment: {
    id: "assignment_001",
    status: "confirmed",
    assignedWorker: {
      id: "worker_001",
      clientSafeDisplayName: "Amina K.",
      privateEmail: "private.worker@example.test",
      privatePhone: "+1-555-0100",
      privateAddress: "Private worker address"
    }
  }
};

describe("Connected Calendar shared domain", () => {
  const views = createConnectedCalendarViews(fixture);

  it("creates a client event with only client-authorized fields", () => {
    expect(views.client).toEqual({
      audience: "client",
      eventType: "client_request",
      requestId: "request_001",
      organizationId: "org_001",
      roleLabel: "Personal Support Worker",
      requestedWorkerCount: 1,
      startsAt: "2026-08-03T12:00:00.000Z",
      endsAt: "2026-08-03T20:00:00.000Z",
      timezone: "America/Toronto",
      locationSummary: "Harbour Residence, Toronto",
      status: "assigned",
      clientEconomics: {
        billRate: { amountMinor: 4500, currency: "CAD" },
        termsVersion: "client-terms-v1"
      }
    });
  });

  it("creates worker offer and confirmed events with only worker-authorized fields", () => {
    expect(views.workerOffer).toMatchObject({
      audience: "worker",
      eventType: "published_offer",
      offerId: "offer_001",
      requestId: "request_001",
      status: "accepted",
      workerEconomics: {
        hourlyRate: { amountMinor: 3000, currency: "CAD" },
        transportationCompensation: { amountMinor: 500, currency: "CAD" },
        termsVersion: "worker-terms-v1"
      }
    });
    expect(views.workerConfirmed).toMatchObject({
      audience: "worker",
      eventType: "confirmed_assignment",
      assignmentId: "assignment_001",
      workerId: "worker_001",
      status: "confirmed"
    });
  });

  it("keeps admin client and worker economics in separate sections without payment secrets", () => {
    expect(views.admin.clientEconomics).toEqual({
      billRate: { amountMinor: 4500, currency: "CAD" },
      termsVersion: "client-terms-v1"
    });
    expect(views.admin.workerOfferEconomics).toEqual({
      hourlyRate: { amountMinor: 3000, currency: "CAD" },
      transportationCompensation: { amountMinor: 500, currency: "CAD" },
      termsVersion: "worker-terms-v1"
    });
    expect(views.admin.paymentMethodReadiness).toBe("verified");
    expect(JSON.stringify(views.admin)).not.toMatch(
      /cardNumber|accountNumber|routingNumber|paymentToken|clientSecret/u
    );
  });

  it("keeps safe projections free of cross-party economics and detects forbidden leaks", () => {
    const clientForbidden = ["workerEconomics", "workerOfferEconomics", "platformMargin", "internalAdminPricing"];
    const workerForbidden = ["clientEconomics", "billRate", "platformMargin", "paymentMethod", "internalAdminNotes"];

    expect(findLeakedEconomicsKeys(views.client, clientForbidden)).toEqual([]);
    expect(findLeakedEconomicsKeys(views.workerOffer, workerForbidden)).toEqual([]);
    expect(
      findLeakedEconomicsKeys(
        { ...views.workerOffer, clientEconomics: fixture.publication.clientEconomics },
        workerForbidden
      )
    ).toContain("clientEconomics");
    expect(
      findLeakedEconomicsKeys(
        { ...views.client, platformMarginMinor: 1500 },
        clientForbidden
      )
    ).toContain("platformMargin");
  });

  it("limits assignment visibility to the minimum client-authorized worker identity", () => {
    expect(views.assignmentVisibility).toEqual({
      audience: "client",
      eventType: "assignment_visibility",
      assignmentId: "assignment_001",
      requestId: "request_001",
      status: "confirmed",
      assignedWorker: {
        displayName: "Amina K.",
        roleLabel: "Personal Support Worker"
      }
    });
    expect(JSON.stringify(views.assignmentVisibility)).not.toMatch(
      /privateEmail|privatePhone|privateAddress|worker_001/u
    );
  });

  it("ends at an attendance handoff without implementing attendance execution", () => {
    expect(views.attendanceHandoff).toEqual({
      eventType: "attendance_handoff",
      assignmentId: "assignment_001",
      eligibility: "ready",
      authority: "handoff_only",
      attendanceExecution: "not_started"
    });
    expect(JSON.stringify(views.attendanceHandoff)).not.toMatch(
      /checkIn|checkOut|punch|attendanceRecordId/u
    );
  });

  it("rejects cross-worker assignment binding and invalid request windows", () => {
    expect(() =>
      createConnectedCalendarViews({
        ...fixture,
        assignment: {
          ...fixture.assignment,
          assignedWorker: { ...fixture.assignment.assignedWorker, id: "worker_002" }
        }
      })
    ).toThrow("RWOS_CONNECTED_CALENDAR_WORKER_MISMATCH");
    expect(() =>
      createConnectedCalendarViews({
        ...fixture,
        request: { ...fixture.request, endsAt: fixture.request.startsAt }
      })
    ).toThrow("RWOS_CONNECTED_CALENDAR_REQUEST_INVALID");
  });
});
