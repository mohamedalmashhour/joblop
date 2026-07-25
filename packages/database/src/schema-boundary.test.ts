import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schema = readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
const migration = readFileSync(
  new URL("../prisma/migrations/20260725000000_phase_01_foundation/migration.sql", import.meta.url),
  "utf8"
);

describe("Prisma Phase 01 schema boundary", () => {
  it("contains every approved Phase 01 entity", () => {
    for (const modelName of [
      "User",
      "UserIdentity",
      "Session",
      "EmployerOrganization",
      "OrganizationMembership",
      "Residence",
      "Department",
      "WorkGroup",
      "RoleDefinition",
      "AccessRoleDefinition",
      "PermissionDefinition",
      "AccessRolePermission",
      "MembershipAccessRole",
      "JobRequestSequence",
      "JobRequest",
      "AuditActorReference",
      "AuditEvent"
    ]) {
      expect(schema).toContain(`model ${modelName}`);
    }
  });

  it("keeps deferred workflow entities out of Phase 01", () => {
    for (const deferredModel of [
      "WorkerOffer",
      "Assignment",
      "AttendanceRecord",
      "Timesheet",
      "Invoice",
      "EmployerPayment",
      "WorkerPayable",
      "Notification",
      "SupportCase"
    ]) {
      expect(schema).not.toContain(`model ${deferredModel}`);
    }
  });

  it("preserves Job Request number and ordering constraints", () => {
    expect(schema).toContain("jobRequestNumber");
    expect(schema).toContain("model JobRequestSequence");
    expect(migration).toContain("job_requests_number_of_workers_check");
    expect(migration).toContain("job_requests_end_after_start_check");
    expect(migration).toContain("job_request_sequences_last_value_check");
  });

  it("prevents RoleDefinition from becoming an access-control role", () => {
    expect(schema).toContain("model RoleDefinition");
    expect(schema).toContain("model AccessRoleDefinition");
    expect(schema).toContain("work_group_id");
    expect(schema).toContain("scope");
  });
});
