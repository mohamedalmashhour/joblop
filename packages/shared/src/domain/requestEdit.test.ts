import { describe, expect, it } from "vitest";
import { classifyRequestEdit, type RequestEditState } from "./requestEdit";

const base: RequestEditState = {
  roleDefinitionId: "role-chef",
  workGroupId: "wg-kitchen",
  residenceId: "res-1",
  departmentId: "dep-1",
  startAt: "2026-08-20T20:00:00.000Z",
  endAt: "2026-08-21T04:00:00.000Z",
  timezone: "America/Toronto",
  numberOfWorkers: 3,
  qualifications: ["food-safety"]
};
const edit = (over: Partial<RequestEditState>): RequestEditState => ({ ...base, ...over });

describe("request edit classifier", () => {
  it("classifies an identical edit as NON_MATERIAL", () => {
    const r = classifyRequestEdit(base, edit({}));
    expect(r.classification).toBe("NON_MATERIAL");
    expect(r.materialFields).toEqual([]);
    expect(r.requiresReconfirmation).toBe(false);
  });

  it("classifies a minor time nudge (<= 60 min, same day) as NON_MATERIAL", () => {
    const r = classifyRequestEdit(base, edit({ startAt: "2026-08-20T20:30:00.000Z" }));
    expect(r.classification).toBe("NON_MATERIAL");
  });

  it("role change is MATERIAL", () => {
    const r = classifyRequestEdit(base, edit({ roleDefinitionId: "role-sous" }));
    expect(r.materialFields).toContain("role");
    expect(r.classification).toBe("MATERIAL");
  });

  it("work location (residence/department) change is MATERIAL", () => {
    expect(classifyRequestEdit(base, edit({ residenceId: "res-2" })).materialFields).toContain("work_location");
    expect(classifyRequestEdit(base, edit({ departmentId: "dep-2" })).materialFields).toContain("work_location");
  });

  it("work-date change is MATERIAL", () => {
    const r = classifyRequestEdit(base, edit({ startAt: "2026-08-21T20:00:00.000Z", endAt: "2026-08-22T04:00:00.000Z" }));
    expect(r.materialFields).toContain("work_date");
  });

  it("a major same-day time change (> 60 min) is MATERIAL", () => {
    const r = classifyRequestEdit(base, edit({ startAt: "2026-08-20T23:00:00.000Z" }));
    expect(r.materialFields).toContain("schedule_time");
  });

  it("timezone change is MATERIAL", () => {
    expect(classifyRequestEdit(base, edit({ timezone: "America/Vancouver" })).materialFields).toContain("timezone");
  });

  it("qualification changes affecting eligibility are MATERIAL (order-insensitive)", () => {
    expect(classifyRequestEdit(base, edit({ qualifications: ["food-safety", "first-aid"] })).materialFields).toContain("qualifications");
    // reordering / case only → not material
    expect(classifyRequestEdit(base, edit({ qualifications: ["FOOD-SAFETY"] })).classification).toBe("NON_MATERIAL");
  });

  it("reducing worker count below confirmed workers is MATERIAL + requires reconfirmation", () => {
    const r = classifyRequestEdit(base, edit({ numberOfWorkers: 1 }), { confirmedWorkers: 2 });
    expect(r.materialFields).toContain("worker_count_confirmed");
    expect(r.requiresReconfirmation).toBe(true);
  });

  it("reducing worker count but staying at/above confirmed is NOT material on that field", () => {
    const r = classifyRequestEdit(base, edit({ numberOfWorkers: 2 }), { confirmedWorkers: 2 });
    expect(r.materialFields).not.toContain("worker_count_confirmed");
  });

  it("a material change with NO confirmed workers does not require reconfirmation", () => {
    const r = classifyRequestEdit(base, edit({ roleDefinitionId: "role-sous" }), { confirmedWorkers: 0 });
    expect(r.classification).toBe("MATERIAL");
    expect(r.requiresReconfirmation).toBe(false);
  });
});
