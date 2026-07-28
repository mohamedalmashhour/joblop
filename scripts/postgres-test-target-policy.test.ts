import { describe, expect, it } from "vitest";

import {
  buildIsolatedDatabaseUrl,
  postgresTestConfirmation,
  validatePostgresTestTarget
} from "./postgres-test-target-policy";

describe("required PostgreSQL target policy", () => {
  const testUrl = "postgresql://rwos@db.example.test/rwos_staging?sslmode=verify-full";
  const testClusterId = "provider/staging/cluster-01";
  const productionClusterId = "provider/production/cluster-01";
  const releaseSha = "0123456789abcdef0123456789abcdef01234567";

  it("accepts an explicit disposable staging target", () => {
    expect(
      validatePostgresTestTarget(
        testUrl,
        postgresTestConfirmation,
        undefined,
        testClusterId,
        productionClusterId,
        releaseSha
      )
    ).toEqual([]);
  });

  it("fails closed without URL or confirmation", () => {
    expect(
      validatePostgresTestTarget(undefined, undefined, undefined, undefined, undefined, undefined)
    ).toEqual(["RWOS_TEST_DATABASE_URL is required for PostgreSQL concurrency validation."]);
    expect(
      validatePostgresTestTarget(testUrl, undefined, undefined, undefined, undefined, undefined)
    ).not.toEqual([]);
  });

  it("rejects an application database and an unlabeled database", () => {
    expect(
      validatePostgresTestTarget(
        testUrl,
        postgresTestConfirmation,
        testUrl,
        testClusterId,
        productionClusterId,
        releaseSha
      )
    ).not.toEqual([]);
    expect(
      validatePostgresTestTarget(
        "postgresql://rwos@db.example.test/resident_workforce",
        postgresTestConfirmation,
        undefined,
        testClusterId,
        productionClusterId,
        releaseSha
      )
    ).not.toEqual([]);
  });

  it("rejects same-cluster URL variants using approved cluster identity", () => {
    expect(
      validatePostgresTestTarget(
        "postgresql://other@alias.example.test/another_test?sslmode=require",
        postgresTestConfirmation,
        "postgresql://app@production.example.test/resident_workforce",
        productionClusterId,
        productionClusterId,
        releaseSha
      )
    ).toContain("The approved test and production database cluster identifiers must differ.");
  });

  it("rejects a missing or abbreviated release SHA", () => {
    expect(
      validatePostgresTestTarget(
        testUrl,
        postgresTestConfirmation,
        undefined,
        testClusterId,
        productionClusterId,
        undefined
      )
    ).toContain("RWOS_RELEASE_SHA is required.");
    expect(
      validatePostgresTestTarget(
        testUrl,
        postgresTestConfirmation,
        undefined,
        testClusterId,
        productionClusterId,
        "6727705"
      )
    ).toContain("RWOS_RELEASE_SHA must be a full lowercase 40-character Git commit SHA.");
  });

  it("rejects ambiguous cluster identities and TLS downgrade", () => {
    expect(
      validatePostgresTestTarget(
        testUrl,
        postgresTestConfirmation,
        undefined,
        "staging",
        productionClusterId,
        releaseSha
      )
    ).toContain("RWOS_TEST_DATABASE_CLUSTER_ID must be an immutable provider-qualified identity.");
    expect(
      validatePostgresTestTarget(
        "postgresql://rwos@db.example.test/rwos_staging?sslmode=disable",
        postgresTestConfirmation,
        undefined,
        testClusterId,
        productionClusterId,
        releaseSha
      )
    ).toContain(
      "RWOS_TEST_DATABASE_URL must require TLS with sslmode=require, verify-ca, or verify-full."
    );
  });

  it("preserves required connection parameters in the isolated database URL", () => {
    const isolated = buildIsolatedDatabaseUrl(
      "postgresql://rwos@db.example.test/rwos_staging?sslmode=require&channel_binding=require",
      "rwos_validation_123"
    );

    expect(isolated.pathname).toBe("/rwos_validation_123");
    expect(isolated.searchParams.get("sslmode")).toBe("require");
    expect(isolated.searchParams.get("channel_binding")).toBe("require");
  });
});
