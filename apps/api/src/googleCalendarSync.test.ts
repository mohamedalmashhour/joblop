import { randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { pushAssignmentToCalendar } from "./googleCalendarSync";
import { encryptSecret, type GoogleOAuthConfig } from "./googleOAuth";

const key = randomBytes(32);
const enabledConfig: GoogleOAuthConfig = {
  enabled: true,
  calendarSyncEnabled: true,
  clientId: "c",
  clientSecret: "s",
  tokenEncKey: key
};

function prismaWith(token: unknown, job: unknown = null) {
  return {
    googleOAuthToken: { findUnique: vi.fn().mockResolvedValue(token) },
    jobRequest: { findUnique: vi.fn().mockResolvedValue(job) }
  } as never;
}

describe("pushAssignmentToCalendar (gating / skip paths)", () => {
  it("skips when calendar sync is globally disabled", async () => {
    const out = await pushAssignmentToCalendar(
      { prisma: prismaWith(null), config: { ...enabledConfig, calendarSyncEnabled: false } },
      { userId: "u1", jobRequestId: "j1" }
    );
    expect(out).toBe("skipped");
  });

  it("skips when the worker has no linked token", async () => {
    const out = await pushAssignmentToCalendar(
      { prisma: prismaWith(null), config: enabledConfig },
      { userId: "u1", jobRequestId: "j1" }
    );
    expect(out).toBe("skipped");
  });

  it("skips when the worker has not opted into calendar sync", async () => {
    const out = await pushAssignmentToCalendar(
      {
        prisma: prismaWith({
          refreshTokenEncrypted: encryptSecret("rt", key),
          calendarSyncEnabled: false
        }),
        config: enabledConfig
      },
      { userId: "u1", jobRequestId: "j1" }
    );
    expect(out).toBe("skipped");
  });

  it("skips when the stored refresh token cannot be decrypted", async () => {
    const out = await pushAssignmentToCalendar(
      {
        prisma: prismaWith({ refreshTokenEncrypted: "", calendarSyncEnabled: true }),
        config: enabledConfig
      },
      { userId: "u1", jobRequestId: "j1" }
    );
    expect(out).toBe("skipped");
  });

  it("skips when the job has no start/end times", async () => {
    const out = await pushAssignmentToCalendar(
      {
        prisma: prismaWith(
          { refreshTokenEncrypted: encryptSecret("rt", key), calendarSyncEnabled: true },
          { title: "x", startAt: null, endAt: null, timezone: null, roleDefinition: null, residence: null }
        ),
        config: enabledConfig
      },
      { userId: "u1", jobRequestId: "j1" }
    );
    // A valid token row is present but the job can't be scheduled → skipped, never a throw.
    expect(out).toBe("skipped");
  });
});
