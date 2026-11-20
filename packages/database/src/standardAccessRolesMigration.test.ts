import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { phase01AccessRoles, phase01PermissionKeys, phase01RolePermissionMappings } from "./catalogue";

const sql = readFileSync(
  new URL("../prisma/migrations/20261108010000_standard_access_roles/migration.sql", import.meta.url),
  "utf8"
);

describe("standard access roles migration", () => {
  it("includes every catalogue role, permission and mapping", () => {
    for (const role of phase01AccessRoles) expect(sql).toContain(`'${role.key}'`);
    for (const permission of phase01PermissionKeys) expect(sql).toContain(`'${permission}'`);
    for (const mapping of phase01RolePermissionMappings) {
      for (const permission of mapping.permissionKeys) {
        expect(sql).toContain(`('${mapping.accessRoleKey}', '${permission}')`);
      }
    }
  });

  it("only adds what is missing", () => {
    expect(sql.match(/ON CONFLICT[^;]*DO NOTHING;/g)).toHaveLength(3);
    expect(sql).not.toMatch(/\b(UPDATE|DELETE|DROP|TRUNCATE|ALTER)\b/);
  });
});
