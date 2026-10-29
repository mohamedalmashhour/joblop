import { describe, expect, it } from "vitest";
import { buildApi } from "./app";

// The advisory job-grading routes. The grading math, input parsing and response mapping are fully
// covered by the @rwos/shared suite (gradePosting / parseGradePostingRequest / contract); here we only
// assert the routes are mounted and auth-gated. (An authenticated end-to-end path is a postgres e2e
// follow-up, consistent with the other employer routes.)
describe("employer job-grading routes (advisory)", () => {
  it("require authentication (401) with no bearer token", async () => {
    const app = buildApi({ env: { ...process.env, RWOS_ENV: "test", NODE_ENV: "test" } });
    const evaluate = await app.inject({
      method: "POST",
      url: "/organizations/00000000-0000-0000-0000-000000000000/job-grading/evaluate",
      payload: {
        family: "service",
        degrees: { skill: 3, effort: 3, responsibility: 3, workingConditions: 3 },
        engagement: "shift",
        marketMedianMinor: 2000,
        currency: "CAD",
        locale: "en"
      }
    });
    const anchors = await app.inject({ method: "GET", url: "/job-grading/anchors" });

    expect(evaluate.statusCode).toBe(401);
    expect(evaluate.json()).toMatchObject({ error: "RWOS_JOBGRADE_DENIED" });
    expect(anchors.statusCode).toBe(401);
    await app.close();
  });
});
