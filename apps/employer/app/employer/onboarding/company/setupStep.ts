export type SetupStep = "company" | "residence" | "department" | "done";

// Where someone should land when they come back to setup, so leaving part-way never strands them.
export function resumeStep(hasCompany: boolean, siteCount: number): SetupStep {
  if (!hasCompany) return "company";
  return siteCount > 0 ? "done" : "residence";
}
