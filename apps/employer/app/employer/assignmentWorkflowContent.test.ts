import { describe, expect, it } from "vitest";
import {
  aiRecommendationBoundaries,
  applicantBoundaries,
  applicantFixtures,
  assignmentBoundaries,
  assignmentDataStates,
  assignmentWorkflow,
  filterApplicants,
  manualAssignmentLifecycle,
  prohibitedSensitiveApplicantData,
  selectAssignmentCandidate
} from "./assignmentWorkflowContent";

describe("Employer applicant and assignment workflow content", () => {
  it("connects the applicant and assignment journey without dead-end routes", () => {
    expect(assignmentWorkflow.map((step) => step.route)).toEqual([
      "/employer/applicants",
      "/employer/applicants/detail",
      "/employer/applicants/compare",
      "/employer/assignments/manual",
      "/employer/assignments/review",
      "/employer/assignments/confirmation",
      "/employer/assignments/worker-response",
      "/employer/assignments/detail",
      "/employer/attendance"
    ]);
  });

  it("keeps applicant review separate from AI decisions and assignment", () => {
    expect(applicantBoundaries).toContain("Applicant review != Assignment");
    expect(applicantBoundaries).toContain("AI explanation != Employer decision");
    expect(aiRecommendationBoundaries).toContain("Recommendation != Assignment");
    expect(aiRecommendationBoundaries).toContain("AI cannot reject, rank secretly, notify, or assign workers");
  });

  it("filters applicants without using sensitive personal data", () => {
    expect(filterApplicants("Shortlisted")).toHaveLength(1);
    expect(filterApplicants("All applicants")).toHaveLength(applicantFixtures.length);
    expect(prohibitedSensitiveApplicantData).toContain("protected characteristics");
    expect(applicantFixtures.every((applicant) => applicant.displayName.startsWith("Candidate"))).toBe(true);
  });

  it("keeps assignment lifecycle and worker response states independent", () => {
    expect(manualAssignmentLifecycle).toEqual([
      "Proposed",
      "Pending Response",
      "Accepted",
      "Declined",
      "Expired",
      "Cancelled"
    ]);
    expect(assignmentBoundaries).toContain("Assignment created != Worker notified");
    expect(assignmentBoundaries).toContain("Accepted != Attendance confirmed");
  });

  it("labels fixture-backed areas and missing integrations truthfully", () => {
    expect(assignmentDataStates).toContain("Fixture-backed candidate data");
    expect(assignmentDataStates).toContain("No real notifications");
    expect(assignmentDataStates).toContain("No simulated worker acceptance");
    expect(assignmentDataStates).toContain("Attendance integration pending");
  });

  it("creates a proposed assignment draft without claiming backend success", () => {
    const draft = selectAssignmentCandidate("app-002");
    expect(draft.assignmentStatus).toBe("Proposed");
    expect(draft.candidate.displayName).toBe("Candidate B");
    expect(draft.authoritativeHandoff).toBe("Pending assignment workflow integration");
  });
});
