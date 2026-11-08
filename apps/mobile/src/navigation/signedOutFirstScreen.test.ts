import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

// Owner rule: a signed-out person first sees the free public job search, not the sign-in screen.
describe("signed-out first screen", () => {
  const source = readFileSync(new URL("./WorkerNavigator.tsx", import.meta.url), "utf8");

  it("starts signed-out people on the public job search", () => {
    expect(source).toContain('useState<GuestView>({ name: "publicJobs" })');
    expect(source).toContain("<PublicJobsScreen");
  });

  it("opens sign-up for job taps / create account and sign-in for Sign in; Back returns to the search", () => {
    expect(source).toContain('onWantDetails={() => setGuestView({ name: "auth", mode: "sign-up" })}');
    expect(source).toContain('onCreateAccount={() => setGuestView({ name: "auth", mode: "sign-up" })}');
    expect(source).toContain('onSignIn={() => setGuestView({ name: "auth", mode: "sign-in" })}');
    expect(source).toContain('onBack={() => setGuestView({ name: "publicJobs" })}');
    // Back must no longer fake a signed-in guest.
    expect(source).not.toContain("onBack={() => onAuthenticatedChange(true)}");
  });

  it("still routes a tapped notification only after real sign-in", () => {
    expect(source).toContain("if (!authenticated || !pendingTarget) return;");
  });
});
