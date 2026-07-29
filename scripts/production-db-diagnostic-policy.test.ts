import { describe, expect, it } from "vitest";

import {
  compareDatabaseInventory,
  productionDiagnosticConfirmation,
  type DatabaseInventory,
  validateProductionDiagnosticEnvironment
} from "./production-db-diagnostic-policy";

const validEnvironment = {
  RWOS_PRODUCTION_DATABASE_URL:
    "postgresql://readonly@db.example.test/resident_workforce_production?sslmode=verify-full",
  RWOS_PRODUCTION_DATABASE_CLUSTER_ID: "provider/production/cluster-01",
  RWOS_PRODUCTION_BASELINE_PATH: "approved/production-baseline.json",
  RWOS_RELEASE_SHA: "0123456789abcdef0123456789abcdef01234567",
  RWOS_PRODUCTION_DATABASE_READ_ONLY: "confirmed",
  RWOS_PRODUCTION_DIAGNOSTIC_CONFIRMATION: productionDiagnosticConfirmation
} as const;

const inventory: DatabaseInventory = {
  columns: [{ schema: "public", table: "User", column: "id", dataType: "text" }],
  foreignKeys: [
    {
      schema: "public",
      table: "Session",
      column: "userId",
      referencedSchema: "public",
      referencedTable: "User",
      referencedColumn: "id",
      sourceType: "text",
      targetType: "text"
    }
  ],
  migrations: [{ name: "20260101000000_init", finished: true, rolledBack: false }],
  objects: [{ schema: "public", name: "User", type: "BASE TABLE" }]
};

describe("production database diagnostic policy", () => {
  it("accepts an explicit read-only production diagnostic target", () => {
    expect(validateProductionDiagnosticEnvironment(validEnvironment)).toEqual([]);
  });

  it("fails closed without owner inputs", () => {
    expect(validateProductionDiagnosticEnvironment({})).toEqual(
      expect.arrayContaining([
        "RWOS_PRODUCTION_DATABASE_URL is required.",
        "RWOS_PRODUCTION_DATABASE_CLUSTER_ID is required.",
        "RWOS_PRODUCTION_DATABASE_READ_ONLY must equal confirmed."
      ])
    );
  });

  it.each([
    [
      "localhost",
      { RWOS_PRODUCTION_DATABASE_URL: "postgresql://u@localhost/prod?sslmode=require" }
    ],
    [
      "test database",
      {
        RWOS_PRODUCTION_DATABASE_URL: "postgresql://u@db.example.test/rwos_test?sslmode=verify-full"
      }
    ],
    [
      "TLS downgrade",
      {
        RWOS_PRODUCTION_DATABASE_URL:
          "postgresql://u@db.example.test/rwos_production?sslmode=disable"
      }
    ],
    ["mutable cluster identity", { RWOS_PRODUCTION_DATABASE_CLUSTER_ID: "production" }],
    ["abbreviated SHA", { RWOS_RELEASE_SHA: "a31fa96" }]
  ])("rejects %s", (_label, override) => {
    expect(
      validateProductionDiagnosticEnvironment({ ...validEnvironment, ...override })
    ).not.toEqual([]);
  });

  it("accepts an exact compatible inventory", () => {
    expect(compareDatabaseInventory(inventory, inventory)).toEqual([]);
  });

  it("rejects drift and incompatible foreign-key lineage", () => {
    const observed: DatabaseInventory = {
      ...inventory,
      foreignKeys: [{ ...inventory.foreignKeys[0], sourceType: "uuid" }]
    };
    expect(compareDatabaseInventory(inventory, observed)).toEqual(
      expect.arrayContaining([
        "Production foreignKeys do not match the approved development baseline.",
        "Incompatible foreign-key types: public.Session.userId."
      ])
    );
  });
});
