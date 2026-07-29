import { describe, expect, it, vi } from "vitest";
import {
  parseOrganizationChoices,
  resolveClientOrganizationId,
  selectClientOrganizationId
} from "./sessionBoundary";

const organizationOneId = "11111111-1111-4111-8111-111111111111";
const organizationTwoId = "22222222-2222-4222-8222-222222222222";
const memberships = {
  memberships: [
    {
      organizationId: organizationOneId,
      organizationPublicId: "ORG-001",
      organizationDisplayName: "Residence One",
      status: "active"
    }
  ]
};

describe("employer organization session context", () => {
  it("discovers the only active membership without mutating context during a read", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({ status: "ok", payload: memberships })
      .mockResolvedValueOnce({
        status: "ok",
        payload: {
          authorized: true,
          capability: "employer_calendar_read",
          organization: { id: organizationOneId }
        }
      });
    const gateway = { request } as unknown as Parameters<typeof resolveClientOrganizationId>[0];

    await expect(resolveClientOrganizationId(gateway, "session-token", null)).resolves.toEqual({
      status: "ok",
      organizationId: organizationOneId
    });
    expect(request).toHaveBeenNthCalledWith(1, "/memberships", "GET", "session-token");
    expect(request).toHaveBeenNthCalledWith(
      2,
      `/authz/employer-calendar/session?organizationId=${organizationOneId}`,
      "GET",
      "session-token"
    );
  });

  it("selects context explicitly only from the same-origin organization mutation", async () => {
    const request = vi.fn().mockResolvedValue({
      status: "ok",
      payload: { organizationContext: { organizationId: organizationOneId } }
    });
    const gateway = { request } as unknown as Parameters<typeof selectClientOrganizationId>[0];
    await expect(
      selectClientOrganizationId(gateway, "session-token", organizationOneId)
    ).resolves.toMatchObject({
      status: "ok"
    });
    expect(request).toHaveBeenCalledWith("/memberships/context/select", "POST", "session-token", {
      organizationId: organizationOneId
    });
  });

  it("requires an explicit choice when multiple active memberships exist", async () => {
    const payload = {
      memberships: [
        ...memberships.memberships,
        {
          organizationId: organizationTwoId,
          organizationPublicId: "ORG-002",
          organizationDisplayName: "Residence Two",
          status: "active"
        }
      ]
    };
    const request = vi.fn().mockResolvedValue({ status: "ok", payload });
    const gateway = { request } as unknown as Parameters<typeof resolveClientOrganizationId>[0];

    await expect(resolveClientOrganizationId(gateway, "session-token", null)).resolves.toEqual({
      status: "context_required",
      organizations: [
        { id: organizationOneId, publicId: "ORG-001", displayName: "Residence One" },
        { id: organizationTwoId, publicId: "ORG-002", displayName: "Residence Two" }
      ]
    });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("whitelists only active, display-safe organization fields", () => {
    expect(
      parseOrganizationChoices({
        memberships: [
          ...memberships.memberships,
          {
            organizationId: "org-secret",
            organizationPublicId: "ORG-SECRET",
            organizationDisplayName: "Suspended",
            status: "suspended",
            rawPaymentSecret: "never-return"
          }
        ]
      })
    ).toEqual([{ id: organizationOneId, publicId: "ORG-001", displayName: "Residence One" }]);
  });

  it("fails closed when the authoritative capability is denied or mismatched", async () => {
    const deniedRequest = vi
      .fn()
      .mockResolvedValueOnce({ status: "ok", payload: memberships })
      .mockResolvedValueOnce({ status: "denied" });
    const deniedGateway = {
      request: deniedRequest
    } as unknown as Parameters<typeof resolveClientOrganizationId>[0];
    await expect(
      resolveClientOrganizationId(deniedGateway, "session-token", organizationOneId)
    ).resolves.toEqual({ status: "denied" });

    const mismatchedRequest = vi
      .fn()
      .mockResolvedValueOnce({ status: "ok", payload: memberships })
      .mockResolvedValueOnce({
        status: "ok",
        payload: {
          authorized: true,
          capability: "employer_calendar_read",
          organization: { id: organizationTwoId }
        }
      });
    const mismatchedGateway = {
      request: mismatchedRequest
    } as unknown as Parameters<typeof resolveClientOrganizationId>[0];
    await expect(
      resolveClientOrganizationId(mismatchedGateway, "session-token", organizationOneId)
    ).resolves.toEqual({ status: "error" });
  });

  it("does not call membership or capability services without a session token", async () => {
    const request = vi.fn();
    const gateway = { request } as unknown as Parameters<typeof resolveClientOrganizationId>[0];
    await expect(resolveClientOrganizationId(gateway, null, null)).resolves.toEqual({
      status: "denied"
    });
    expect(request).not.toHaveBeenCalled();
  });

  it("does not call context selection without a token or a valid organization identifier", async () => {
    const request = vi.fn();
    const gateway = { request } as unknown as Parameters<typeof selectClientOrganizationId>[0];

    await expect(
      selectClientOrganizationId(gateway, null, organizationOneId)
    ).resolves.toEqual({ status: "denied" });
    await expect(
      selectClientOrganizationId(gateway, "session-token", "organization-two")
    ).resolves.toEqual({ status: "denied" });
    expect(request).not.toHaveBeenCalled();
  });

  it("drops malformed active memberships instead of exposing selectable contexts", () => {
    expect(
      parseOrganizationChoices({
        memberships: [
          {
            organizationId: "not-an-organization-id",
            organizationPublicId: "ORG-INVALID",
            organizationDisplayName: "Invalid",
            status: "active"
          },
          {
            organizationId: organizationTwoId,
            organizationPublicId: " ",
            organizationDisplayName: "Test Employer Organization B",
            status: "active"
          }
        ]
      })
    ).toEqual([]);
  });
});
