import { describe, expect, it, vi } from "vitest";
import {
  parseOrganizationChoices,
  resolveClientOrganizationId,
  selectClientOrganizationId
} from "./sessionBoundary";

const memberships = {
  memberships: [
    {
      organizationId: "org-1",
      organizationPublicId: "ORG-001",
      organizationDisplayName: "Residence One",
      status: "active"
    }
  ]
};

describe("employer organization session context", () => {
  it("discovers the only active membership without mutating context during a read", async () => {
    const request = vi.fn().mockResolvedValueOnce({ status: "ok", payload: memberships });
    const gateway = { request } as unknown as Parameters<typeof resolveClientOrganizationId>[0];

    await expect(resolveClientOrganizationId(gateway, "session-token", null)).resolves.toEqual({
      status: "ok",
      organizationId: "org-1"
    });
    expect(request).toHaveBeenNthCalledWith(1, "/memberships", "GET", "session-token");
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("selects context explicitly only from the same-origin organization mutation", async () => {
    const request = vi.fn().mockResolvedValue({
      status: "ok",
      payload: { organizationContext: { organizationId: "org-1" } }
    });
    const gateway = { request } as unknown as Parameters<typeof selectClientOrganizationId>[0];
    await expect(selectClientOrganizationId(gateway, "session-token", "org-1")).resolves.toMatchObject({
      status: "ok"
    });
    expect(request).toHaveBeenCalledWith(
      "/memberships/context/select",
      "POST",
      "session-token",
      { organizationId: "org-1" }
    );
  });

  it("requires an explicit choice when multiple active memberships exist", async () => {
    const payload = {
      memberships: [
        ...memberships.memberships,
        {
          organizationId: "org-2",
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
        { id: "org-1", publicId: "ORG-001", displayName: "Residence One" },
        { id: "org-2", publicId: "ORG-002", displayName: "Residence Two" }
      ]
    });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("whitelists only active, display-safe organization fields", () => {
    expect(parseOrganizationChoices({
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
    })).toEqual([{ id: "org-1", publicId: "ORG-001", displayName: "Residence One" }]);
  });
});
