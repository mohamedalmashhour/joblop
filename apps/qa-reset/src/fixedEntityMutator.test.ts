import { describe, expect, it, vi } from "vitest";
import { createFixedEntityMutator } from "./fixedEntityMutator";
import { ownedEntityTypes } from "./manifest";
import { QaResetPersistenceConflictError, type SqlConnection } from "./postgresRepository";
import { testManifest as manifest } from "./testFixture";

describe("fixed relational entity mutator", () => {
  it("supports and emits guarded exact inserts for every manifest-owned entity type", async () => {
    const mutator = createFixedEntityMutator();
    expect(mutator.supportedEntityTypes).toEqual(ownedEntityTypes);
    for (const record of manifest.records.filter(
      ({ ownership, entityType }) =>
        ownership === "manifest_owned" && entityType !== "worker_offer_terms"
    )) {
      const query = vi.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      await expect(mutator.prepare({ query }, record)).resolves.toBe(1);
      expect(query.mock.calls[0]?.[0]).toContain(`qa-reset:entity-prepare:${record.entityType}`);
      expect(query.mock.calls[0]?.[0]).toContain("INSERT INTO");
    }
  });

  it("supports exact cleanup for every manifest entity path", async () => {
    const mutator = createFixedEntityMutator();
    const covered = new Set<(typeof ownedEntityTypes)[number]>();
    for (const record of manifest.records) {
      const query = vi.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      await expect(mutator.cleanup({ query }, record)).resolves.toBe(1);
      covered.add(record.entityType);
      if (record.ownership === "approved_reference") {
        expect(query).not.toHaveBeenCalled();
      } else if (["audit_actor_reference", "audit_event"].includes(record.entityType)) {
        expect(query.mock.calls[0]?.[0]).toContain(`qa-reset:entity-cleanup:${record.entityType}`);
        expect(query.mock.calls[0]?.[0]).toContain("IS NOT DISTINCT FROM");
      } else {
        expect(query.mock.calls.at(-1)?.[0]).toContain(
          `qa-reset:entity-cleanup:${record.entityType}`
        );
      }
    }
    expect(covered).toEqual(new Set(ownedEntityTypes));
  });

  it("supplies transaction-stable updated_at values required by raw inserts", async () => {
    for (const entityType of [
      "employer_organization",
      "work_group",
      "role_definition",
      "synthetic_user",
      "user_identity",
      "residence",
      "department",
      "job_request",
      "staffing_request_calendar_profile",
      "dispatch_review",
      "dispatch_candidate"
    ] as const) {
      const query = vi.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      await createFixedEntityMutator().prepare({ query }, find(entityType));
      expect(query.mock.calls[0]?.[0]).toContain("updated_at");
      expect(query.mock.calls[0]?.[0]).toContain("CURRENT_TIMESTAMP");
    }
  });

  it("verifies the approved role reference instead of mutating it", async () => {
    const record = find("access_role_definition");
    const query = vi.fn().mockResolvedValue({ rows: [{ id: record.recordId }], rowCount: 1 });
    const mutator = createFixedEntityMutator();
    await expect(mutator.prepare({ query }, record)).resolves.toBe(1);
    expect(query.mock.calls[0]?.[0]).toContain("SELECT id");
    await expect(mutator.cleanup({ query }, record)).resolves.toBe(1);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("performs the offer terms cycle as insert then exact bind, and unbind then delete", async () => {
    const record = find("worker_offer_terms");
    const query = vi.fn().mockResolvedValue({ rows: [], rowCount: 1 });
    const mutator = createFixedEntityMutator();
    await mutator.prepare({ query }, record);
    expect(query.mock.calls.map(([sql]) => String(sql))).toEqual([
      expect.stringContaining("INSERT INTO worker_offer_terms_versions"),
      expect.stringContaining("UPDATE worker_offers")
    ]);
    query.mockClear();
    await mutator.cleanup({ query }, record);
    expect(query.mock.calls.map(([sql]) => String(sql))).toEqual([
      expect.stringContaining("SET current_terms_version_id = NULL"),
      expect.stringContaining("DELETE FROM worker_offer_terms_versions")
    ]);
  });

  it("uses both columns of the membership role identity", async () => {
    const record = find("membership_access_role");
    const query = vi.fn().mockResolvedValue({ rows: [], rowCount: 1 });
    const mutator = createFixedEntityMutator();
    await mutator.prepare({ query }, record);
    expect(query.mock.calls[0]?.[0]).toContain("(membership_id, access_role_definition_id)");
    await mutator.cleanup({ query }, record);
    expect(query.mock.calls[1]?.[0]).toContain(
      "membership_id = $1 AND access_role_definition_id = $2"
    );
  });

  it("fails closed on any non-exact affected-row result", async () => {
    const mutator = createFixedEntityMutator();
    const connection: SqlConnection = {
      query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 })
    };
    await expect(mutator.prepare(connection, find("employer_organization"))).rejects.toBeInstanceOf(
      QaResetPersistenceConflictError
    );
    await expect(mutator.cleanup(connection, find("employer_organization"))).rejects.toBeInstanceOf(
      QaResetPersistenceConflictError
    );
    await expect(mutator.cleanup(connection, find("audit_actor_reference"))).rejects.toBeInstanceOf(
      QaResetPersistenceConflictError
    );
    await expect(mutator.cleanup(connection, find("audit_event"))).rejects.toBeInstanceOf(
      QaResetPersistenceConflictError
    );
  });

  it("rejects payload fields outside the fixed schema before issuing SQL", async () => {
    const query = vi.fn();
    const record = find("employer_organization");
    const forged = {
      ...record,
      payload: { ...record.payload, injectedColumn: "denied" }
    } as unknown as typeof record;
    await expect(createFixedEntityMutator().prepare({ query }, forged)).rejects.toBeInstanceOf(
      QaResetPersistenceConflictError
    );
    expect(query).not.toHaveBeenCalled();
  });

  function find(entityType: (typeof ownedEntityTypes)[number]) {
    return manifest.records.find((record) => record.entityType === entityType)!;
  }
});
