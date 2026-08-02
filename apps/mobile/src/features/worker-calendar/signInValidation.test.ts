import { describe, expect, it } from "vitest";
import { validateWorkerSignInInput } from "./signInValidation";

describe("worker sign-in validation", () => {
  it.each(["", "worker", "worker@", "@example.test", "worker @example.test"])(
    "rejects malformed email %j before transport",
    (email) => {
      expect(validateWorkerSignInInput(email, "Synthetic-password-1!")).toBe(
        "Enter a valid email address."
      );
    }
  );

  it("requires a password and accepts normalized valid credentials", () => {
    expect(validateWorkerSignInInput("worker@example.test", "")).toBe("Enter your password.");
    expect(validateWorkerSignInInput(" worker@example.test ", "Synthetic-password-1!")).toBeNull();
  });
});
