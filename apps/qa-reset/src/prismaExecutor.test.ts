import { describe, expect, it, vi } from "vitest";
import { createPrismaTransactionExecutor } from "./prismaExecutor";

describe("Prisma QA-reset SQL executor", () => {
  it("uses parameterized raw queries and the supplied transaction client", async () => {
    const transaction = {
      $queryRawUnsafe: vi.fn(async () => [{ id: "safe-id" }]),
      $executeRawUnsafe: vi.fn(async () => 1)
    };
    const client = {
      ...transaction,
      $transaction: vi.fn(async (work: (port: typeof transaction) => Promise<unknown>) =>
        work(transaction)
      )
    };
    const executor = createPrismaTransactionExecutor(client as never);
    const result = await executor.transaction((connection) =>
      connection.query(
        "/* qa-reset:manifest */ SELECT id FROM qa_reset_manifest_ownership WHERE id = $1",
        ["safe-id"]
      )
    );
    expect(result).toEqual({ rows: [{ id: "safe-id" }], rowCount: 1 });
    expect(transaction.$queryRawUnsafe).toHaveBeenCalledWith(
      "/* qa-reset:manifest */ SELECT id FROM qa_reset_manifest_ownership WHERE id = $1",
      "safe-id"
    );
    await expect(
      executor.query(
        "/* qa-reset:advisory-lock */ SELECT pg_advisory_xact_lock(hashtextextended($1, 0))::text AS lock_result",
        ["safe-lock"]
      )
    ).resolves.toEqual({ rows: [{ id: "safe-id" }], rowCount: 1 });
  });

  it("returns exact affected rows and rejects statements outside the allowlisted classes", async () => {
    const client = {
      $queryRawUnsafe: vi.fn(async () => []),
      $executeRawUnsafe: vi.fn(async () => 1),
      $transaction: vi.fn()
    };
    const executor = createPrismaTransactionExecutor(client as never);
    expect(
      await executor.query(
        "/* qa-reset:owned-record */ UPDATE qa_reset_owned_records SET lifecycle_status = $1 WHERE id = $2",
        ["prepared", "safe-id"]
      )
    ).toEqual({ rows: [], rowCount: 1 });
    await expect(executor.query("ALTER TABLE approved_table DROP COLUMN value")).rejects.toThrow(
      "RWOS_QA_RESET_SQL_STATEMENT_DENIED"
    );
  });

  it("rejects untagged, forged, multi-statement and unsupported entity SQL before Prisma", async () => {
    const client = {
      $queryRawUnsafe: vi.fn(async () => []),
      $executeRawUnsafe: vi.fn(async () => 1),
      $transaction: vi.fn()
    };
    const executor = createPrismaTransactionExecutor(client as never);
    for (const sql of [
      "DELETE FROM users WHERE id = $1",
      "/* policy */ DELETE FROM users WHERE id = $1",
      "/* qa-reset:unknown */ DELETE FROM users WHERE id = $1",
      "/* qa-reset:advisory-lock */ SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      "/* qa-reset:event */ INSERT INTO qa_reset_control_events (id, control_run_id, sequence, event_type, prior_status, new_status, caller_alias, caller_principal_digest, safe_count, created_at) VALUES ($1, $2, 1, $3, 'running', $3, $4, $5, $6, $7)",
      "/* qa-reset:manifest */ SELECT $1",
      "/* qa-reset:entity-prepare:assignment */ SELECT $1 WHERE $1 = $1",
      "/* qa-reset:entity-cleanup:not_supported */ DELETE FROM users WHERE id = $1",
      "/* qa-reset:owned-record */ DELETE FROM users WHERE id = $1",
      "/* qa-reset:entity-cleanup:assignment */ DELETE FROM users WHERE id = $1",
      "/* qa-reset:entity-cleanup:assignment */ DELETE FROM assignments",
      "/* qa-reset:entity-cleanup:assignment */ DELETE FROM assignments WHERE organization_id = $1",
      "/* qa-reset:entity-cleanup:assignment */ DELETE FROM assignments WHERE id = $1 OR TRUE",
      "/* qa-reset:entity-cleanup:assignment */ DELETE FROM assignments USING users WHERE id = $1",
      "/* qa-reset:entity-prepare:assignment */ SELECT id FROM assignments",
      "/* qa-reset:entity-prepare:assignment */ INSERT INTO assignments DEFAULT VALUES",
      "/* qa-reset:owned-record */ DELETE FROM qa_reset_owned_records WHERE id = $1",
      "/* qa-reset:complete-control */ UPDATE qa_reset_control_runs SET status = 'done'",
      "/* qa-reset:owned-record */ DELETE FROM users WHERE id = $1; DELETE FROM users",
      "/* qa-reset:owned-record */ TRUNCATE users"
    ]) {
      await expect(executor.query(sql, ["safe-id"])).rejects.toThrow(
        "RWOS_QA_RESET_SQL_STATEMENT_DENIED"
      );
    }
    expect(client.$queryRawUnsafe).not.toHaveBeenCalled();
    expect(client.$executeRawUnsafe).not.toHaveBeenCalled();
  });

  it("allows only bounded parameterized entity prepare and cleanup shapes", async () => {
    const client = {
      $queryRawUnsafe: vi.fn(async () => []),
      $executeRawUnsafe: vi.fn(async () => 1),
      $transaction: vi.fn()
    };
    const executor = createPrismaTransactionExecutor(client as never);
    await expect(
      executor.query(
        "/* qa-reset:entity-prepare:assignment */ INSERT INTO assignments (id) VALUES ($1)",
        ["safe-id"]
      )
    ).resolves.toEqual({ rows: [], rowCount: 1 });
    await expect(
      executor.query(
        `/* qa-reset:event */
         INSERT INTO qa_reset_control_events
           (id, control_run_id, sequence, event_type, prior_status, new_status,
            caller_alias, caller_principal_digest, safe_count, created_at)
         VALUES ($1, $2, 1, $3, 'running', $4, $5, $6, $7, $8)`,
        ["event", "run", "succeeded", "succeeded", "caller", "digest", 1, new Date()]
      )
    ).resolves.toEqual({ rows: [], rowCount: 1 });
    await expect(
      executor.query(
        "/* qa-reset:entity-prepare:membership_access_role */ INSERT INTO membership_access_roles (membership_id, access_role_definition_id) VALUES ($1, $2)",
        ["membership-id", "role-id"]
      )
    ).resolves.toEqual({ rows: [], rowCount: 1 });
    await expect(
      executor.query(
        "/* qa-reset:entity-cleanup:assignment */ DELETE FROM assignments WHERE id = $1",
        ["safe-id"]
      )
    ).resolves.toEqual({ rows: [], rowCount: 1 });
    await expect(
      executor.query(
        "/* qa-reset:entity-cleanup:membership_access_role */ DELETE FROM membership_access_roles WHERE membership_id = $1 AND access_role_definition_id = $2",
        ["membership-id", "role-id"]
      )
    ).resolves.toEqual({ rows: [], rowCount: 1 });
    await expect(
      executor.query(
        "/* qa-reset:entity-cleanup:audit_actor_reference */ SELECT id FROM audit_actor_references WHERE id IS NOT DISTINCT FROM $1 AND actor_type IS NOT DISTINCT FROM $2 AND user_id IS NOT DISTINCT FROM $3 AND organization_id IS NOT DISTINCT FROM $4 AND display_label IS NOT DISTINCT FROM $5",
        ["actor-id", "system", null, null, "Synthetic QA reset evidence actor"]
      )
    ).resolves.toEqual({ rows: [], rowCount: 0 });
    await expect(
      executor.query(
        "/* qa-reset:entity-cleanup:audit_actor_reference */ SELECT id FROM audit_actor_references WHERE id = $1",
        ["actor-id"]
      )
    ).rejects.toThrow("RWOS_QA_RESET_SQL_STATEMENT_DENIED");
  });

  it("requires placeholders to match the exact contiguous parameter list", async () => {
    const client = {
      $queryRawUnsafe: vi.fn(async () => []),
      $executeRawUnsafe: vi.fn(async () => 1),
      $transaction: vi.fn()
    };
    const executor = createPrismaTransactionExecutor(client as never);
    const statement =
      "/* qa-reset:entity-cleanup:assignment */ DELETE FROM assignments WHERE id = $1";
    for (const [sql, parameters] of [
      [statement, []],
      [statement, ["safe-id", "unused"]],
      [
        "/* qa-reset:entity-cleanup:assignment */ DELETE FROM assignments WHERE id = $2",
        ["unused", "safe-id"]
      ],
      ["/* qa-reset:entity-cleanup:assignment */ DELETE FROM assignments WHERE id = $0", []]
    ] as const) {
      await expect(executor.query(sql, parameters)).rejects.toThrow(
        "RWOS_QA_RESET_SQL_STATEMENT_DENIED"
      );
    }
    expect(client.$executeRawUnsafe).not.toHaveBeenCalled();
  });
});
