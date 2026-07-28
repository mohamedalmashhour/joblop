import { describe, expect, it } from "vitest";
import {
  databaseIdentity,
  rehearsalConfirmation,
  validateDatabaseRehearsalInput
} from "./database-rehearsal-policy";

describe("database restore rehearsal guardrails", () => {
  const source = "postgresql://operator:secret@db.example.test/rwos?sslmode=verify-full";
  const target =
    "postgresql://operator:secret@restore.example.test/rwos_restore_test?sslmode=verify-full";
  const validInput = {
    sourceDatabaseUrl: source,
    targetDatabaseUrl: target,
    targetIdentity: "restore.example.test/operator/rwos_restore_test",
    sourceClusterId: "provider/production/cluster-01",
    targetClusterId: "provider/restore/cluster-01",
    releaseSha: "0123456789abcdef0123456789abcdef01234567",
    confirmation: rehearsalConfirmation
  } as const;

  it("accepts only an explicitly confirmed disposable PostgreSQL target", () => {
    expect(validateDatabaseRehearsalInput(validInput).target.pathname).toBe("/rwos_restore_test");
  });

  it.each([
    {
      ...validInput,
      targetDatabaseUrl: source,
      targetIdentity: "db.example.test/operator/rwos"
    },
    {
      ...validInput,
      targetDatabaseUrl:
        "postgresql://operator:secret@restore.example.test/rwos?sslmode=verify-full",
      targetIdentity: "db.example.test/operator/rwos"
    },
    {
      ...validInput,
      confirmation: "yes"
    },
    {
      ...validInput,
      sourceDatabaseUrl: "mysql://db.example.test/rwos"
    },
    {
      ...validInput,
      targetIdentity: "production.example.test/operator/rwos_restore_test"
    },
    {
      ...validInput,
      targetClusterId: validInput.sourceClusterId
    },
    {
      ...validInput,
      targetDatabaseUrl: "postgresql://operator:secret@restore.example.test/rwos_restore_test"
    },
    {
      ...validInput,
      releaseSha: "6727705"
    }
  ])("rejects unsafe rehearsal input", (input) => {
    expect(() => validateDatabaseRehearsalInput(input)).toThrow(/^RWOS_DATABASE_REHEARSAL_/);
  });

  it("derives an explicit host, account, and database identity", () => {
    expect(databaseIdentity(new URL(target))).toBe(
      "restore.example.test/operator/rwos_restore_test"
    );
  });
});
