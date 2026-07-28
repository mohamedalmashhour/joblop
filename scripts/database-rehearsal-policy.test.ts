import { describe, expect, it } from "vitest";
import {
  databaseIdentity,
  rehearsalConfirmation,
  validateDatabaseRehearsalInput
} from "./database-rehearsal-policy";

describe("database restore rehearsal guardrails", () => {
  const source = "postgresql://operator:secret@db.example.test/rwos";
  const target = "postgresql://operator:secret@db.example.test/rwos_restore_test";

  it("accepts only an explicitly confirmed disposable PostgreSQL target", () => {
    expect(
      validateDatabaseRehearsalInput({
        sourceDatabaseUrl: source,
        targetDatabaseUrl: target,
        targetIdentity: "db.example.test/operator/rwos_restore_test",
        confirmation: rehearsalConfirmation
      }).target.pathname
    ).toBe("/rwos_restore_test");
  });

  it.each([
    {
      sourceDatabaseUrl: source,
      targetDatabaseUrl: source,
      targetIdentity: "db.example.test/operator/rwos",
      confirmation: rehearsalConfirmation
    },
    {
      sourceDatabaseUrl: source,
      targetDatabaseUrl: "postgresql://operator:secret@db.example.test/rwos",
      targetIdentity: "db.example.test/operator/rwos",
      confirmation: rehearsalConfirmation
    },
    {
      sourceDatabaseUrl: source,
      targetDatabaseUrl: target,
      targetIdentity: "db.example.test/operator/rwos_restore_test",
      confirmation: "yes"
    },
    {
      sourceDatabaseUrl: "mysql://db.example.test/rwos",
      targetDatabaseUrl: target,
      targetIdentity: "db.example.test/operator/rwos_restore_test",
      confirmation: rehearsalConfirmation
    },
    {
      sourceDatabaseUrl: source,
      targetDatabaseUrl: target,
      targetIdentity: "production.example.test/operator/rwos_restore_test",
      confirmation: rehearsalConfirmation
    }
  ])("rejects unsafe rehearsal input", (input) => {
    expect(() => validateDatabaseRehearsalInput(input)).toThrow(/^RWOS_DATABASE_REHEARSAL_/);
  });

  it("derives an explicit host, account, and database identity", () => {
    expect(databaseIdentity(new URL(target))).toBe("db.example.test/operator/rwos_restore_test");
  });
});
