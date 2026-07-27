import { describe, expect, it, vi } from "vitest";
import { clearWebCalendarSession } from "./authenticatedCalendarClient";

describe("authenticated calendar browser session actions", () => {
  it("reports only successful same-origin sign-out responses as cleared", async () => {
    const success = vi.fn(async () => ({ ok: true }));
    const denied = vi.fn(async () => ({ ok: false }));
    const offline = vi.fn(async () => { throw new Error("offline"); });

    await expect(clearWebCalendarSession(success)).resolves.toBe(true);
    await expect(clearWebCalendarSession(denied)).resolves.toBe(false);
    await expect(clearWebCalendarSession(offline)).resolves.toBe(false);
    expect(success).toHaveBeenCalledWith("/api/session/sign-out", { method: "POST" });
  });
});
