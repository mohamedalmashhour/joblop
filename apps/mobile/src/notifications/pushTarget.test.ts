import { describe, expect, it } from "vitest";
import { pushPlatformFor, readEasProjectId, readPushTarget } from "./pushTarget";

describe("push notification target", () => {
  it("reads the three screens and keeps safe ids", () => {
    expect(readPushTarget({ screen: "calendar", jobRequestId: "job_1" })).toEqual({ screen: "calendar", jobRequestId: "job_1" });
    expect(readPushTarget({ screen: "contact", conversationId: "conv-9" })).toEqual({ screen: "contact", conversationId: "conv-9" });
    expect(readPushTarget({ screen: "pay" })).toEqual({ screen: "pay" });
  });

  it("ignores unknown screens, bad data and unsafe ids", () => {
    expect(readPushTarget(null)).toBeNull();
    expect(readPushTarget("calendar")).toBeNull();
    expect(readPushTarget({ screen: "admin" })).toBeNull();
    expect(readPushTarget({ screen: "contact", conversationId: "../../x" })).toEqual({ screen: "contact" });
  });
});

describe("push platform and project id", () => {
  it("only registers on phones", () => {
    expect(pushPlatformFor("ios")).toBe("ios");
    expect(pushPlatformFor("android")).toBe("android");
    expect(pushPlatformFor("web")).toBeNull();
  });

  it("reads the EAS project id and returns null when the owner has not added it", () => {
    expect(readEasProjectId({ expoConfig: { extra: { eas: { projectId: "abc-123" } } } })).toBe("abc-123");
    expect(readEasProjectId({ easConfig: { projectId: "from-eas" } })).toBe("from-eas");
    expect(readEasProjectId({ expoConfig: { extra: { foundationOnly: true } } })).toBeNull();
    expect(readEasProjectId({ expoConfig: { extra: { eas: { projectId: "  " } } } })).toBeNull();
    expect(readEasProjectId(undefined)).toBeNull();
  });
});
