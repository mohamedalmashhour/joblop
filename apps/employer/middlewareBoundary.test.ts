import { describe, expect, it } from "vitest";
import { hasEmployerCalendarCapability, isConnectedRuntimeEnvironment } from "./middleware";

const organizationA = "11111111-1111-4111-8111-111111111111";
const organizationB = "22222222-2222-4222-8222-222222222222";

describe("employer middleware organization capability boundary", () => {
  it("uses persisted authenticated boundaries in staging and production only", () => {
    expect(isConnectedRuntimeEnvironment("staging")).toBe(true);
    expect(isConnectedRuntimeEnvironment("production")).toBe(true);
    expect(isConnectedRuntimeEnvironment("development")).toBe(false);
  });

  it("accepts only the exact employer capability for the selected organization", () => {
    expect(
      hasEmployerCalendarCapability(
        {
          authorized: true,
          capability: "employer_calendar_read",
          organization: { id: organizationA }
        },
        organizationA
      )
    ).toBe(true);
  });

  it.each([
    [
      "cross-organization",
      {
        authorized: true,
        capability: "employer_calendar_read",
        organization: { id: organizationB }
      }
    ],
    [
      "wrong capability",
      {
        authorized: true,
        capability: "platform_supervise",
        organization: { id: organizationA }
      }
    ],
    [
      "explicit denial",
      {
        authorized: false,
        capability: "employer_calendar_read",
        organization: { id: organizationA }
      }
    ],
    ["malformed payload", { authorized: true }]
  ])("fails closed for a %s response", (_label, payload) => {
    expect(hasEmployerCalendarCapability(payload, organizationA)).toBe(false);
  });
});
