import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schema = readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
const migration = readFileSync(
  new URL(
    "../prisma/migrations/20260727000000_calendar_request_persistence/migration.sql",
    import.meta.url
  ),
  "utf8"
);
const calendarProfileSchema = schema.match(
  /model StaffingRequestCalendarProfile \{[\s\S]*?\n\}/
)?.[0];

if (!calendarProfileSchema) {
  throw new Error("StaffingRequestCalendarProfile schema block is missing.");
}

describe("calendar request persistence boundary", () => {
  it("adds one calendar profile to the authoritative JobRequest lifecycle", () => {
    expect(schema).toContain("model StaffingRequestCalendarProfile");
    expect(schema).toContain("jobRequestId");
    expect(schema).toContain("calendarProfile   StaffingRequestCalendarProfile?");
    expect(migration).toContain('REFERENCES "job_requests"("id")');
    expect(migration).toContain('"staffing_request_calendar_profiles_job_request_id_key"');
  });

  it("persists operational metadata and verification state without money authority", () => {
    for (const approvedField of [
      "dutiesSummary",
      "qualifications",
      "addressSummary",
      "specialInstructions",
      "contractVerificationState",
      "paymentMethodReadinessState",
      "locationVerificationState",
      "version"
    ]) {
      expect(calendarProfileSchema).toContain(approvedField);
    }

    for (const forbiddenField of [
      "clientBillRate",
      "workerPay",
      "workerPayout",
      "platformMargin",
      "paymentMethodToken",
      "taxAmount",
      "invoiceId",
      "notificationId",
      "attendanceExecution"
    ]) {
      expect(calendarProfileSchema).not.toContain(forbiddenField);
      expect(migration).not.toContain(forbiddenField);
    }
  });

  it("supports optimistic concurrency and indexed tenant reads", () => {
    expect(schema).toMatch(/version\s+Int\s+@default\(1\)/);
    expect(migration).toContain('"staffing_request_calendar_profiles_org_updated_idx"');
    expect(migration).toContain('"staffing_request_calendar_profiles_residence_updated_idx"');
  });
});
