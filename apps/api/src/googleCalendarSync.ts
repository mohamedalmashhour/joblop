import { createHash } from "node:crypto";
import {
  GOOGLE_CALENDAR_EVENTS_ENDPOINT,
  decryptSecret,
  refreshAccessToken,
  type GoogleOAuthConfig
} from "./googleOAuth";

// Direct Google Calendar sync: when a worker accepts a shift, push (or update) an event on their
// own Google Calendar. Entirely best-effort and flag-gated — it must NEVER block or fail the accept.
// Opt-in per worker: only runs when the worker granted the calendar scope (calendar_sync_enabled)
// and we hold an encrypted refresh token for them.

export type CalendarSyncOutcome = "synced" | "skipped" | "failed";

// Prisma surface this module needs (kept narrow; the real client satisfies it).
interface CalendarSyncPrisma {
  googleOAuthToken: {
    findUnique(args: {
      where: { userId: string };
      select: {
        refreshTokenEncrypted: true;
        calendarSyncEnabled: true;
      };
    }): Promise<{ refreshTokenEncrypted: string; calendarSyncEnabled: boolean } | null>;
  };
  jobRequest: {
    findUnique(args: {
      where: { id: string };
      select: {
        title: true;
        startAt: true;
        endAt: true;
        timezone: true;
        roleDefinition: { select: { displayLabel: true } };
        residence: { select: { city: true; province: true } };
      };
    }): Promise<{
      title: string | null;
      startAt: Date | null;
      endAt: Date | null;
      timezone: string | null;
      roleDefinition: { displayLabel: string | null } | null;
      residence: { city: string | null; province: string | null } | null;
    } | null>;
  };
}

// Deterministic Google event id (charset [a-v0-9], 5–1024 chars) so re-syncing updates in place
// instead of creating duplicates. SHA-1 hex is a valid subset of the allowed charset.
function deterministicEventId(userId: string, jobRequestId: string): string {
  return "jl" + createHash("sha1").update(`${userId}:${jobRequestId}`).digest("hex");
}

export async function pushAssignmentToCalendar(
  deps: { prisma: CalendarSyncPrisma; config: GoogleOAuthConfig },
  input: { userId: string; jobRequestId: string }
): Promise<CalendarSyncOutcome> {
  if (!deps.config.calendarSyncEnabled) return "skipped";
  try {
    const link = await deps.prisma.googleOAuthToken.findUnique({
      where: { userId: input.userId },
      select: { refreshTokenEncrypted: true, calendarSyncEnabled: true }
    });
    if (!link || !link.calendarSyncEnabled) return "skipped";
    const refreshToken = decryptSecret(link.refreshTokenEncrypted, deps.config.tokenEncKey);
    if (!refreshToken) return "skipped";

    const job = await deps.prisma.jobRequest.findUnique({
      where: { id: input.jobRequestId },
      select: {
        title: true,
        startAt: true,
        endAt: true,
        timezone: true,
        roleDefinition: { select: { displayLabel: true } },
        residence: { select: { city: true, province: true } }
      }
    });
    if (!job || !job.startAt || !job.endAt) return "skipped";

    const accessToken = await refreshAccessToken({ config: deps.config, refreshToken });

    const tz = job.timezone ?? "America/Toronto";
    const role = job.roleDefinition?.displayLabel ?? job.title ?? "Shift";
    const area = [job.residence?.city, job.residence?.province].filter(Boolean).join(", ");
    const event = {
      id: deterministicEventId(input.userId, input.jobRequestId),
      summary: `Joblop — ${role}`,
      description: "Confirmed shift via Joblop.",
      ...(area ? { location: area } : {}),
      start: { dateTime: job.startAt.toISOString(), timeZone: tz },
      end: { dateTime: job.endAt.toISOString(), timeZone: tz },
      source: { title: "Joblop", url: "https://joblop.com" }
    };

    // Insert first; if the deterministic id already exists, update it in place.
    const insertRes = await fetch(GOOGLE_CALENDAR_EVENTS_ENDPOINT, {
      method: "POST",
      headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
      body: JSON.stringify(event)
    });
    if (insertRes.ok) return "synced";
    if (insertRes.status === 409) {
      const updateRes = await fetch(
        `${GOOGLE_CALENDAR_EVENTS_ENDPOINT}/${encodeURIComponent(event.id)}`,
        {
          method: "PUT",
          headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
          body: JSON.stringify(event)
        }
      );
      return updateRes.ok ? "synced" : "failed";
    }
    return "failed";
  } catch {
    return "failed";
  }
}
