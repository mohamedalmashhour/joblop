export const staffingCategories = [
  {
    name: "Kitchen",
    roles: "Chef diplômé, Sous-chef, Cuisinier, Aide-cuisinier, Dishwasher",
    detail:
      "Food service coverage with shift requirements, food-safety context, and kitchen handoff notes."
  },
  {
    name: "Care / Nurse",
    roles: "Préposé(e) aux bénéficiaires, Nurse, care aide",
    detail:
      "Credential-aware requests for supervised care environments without exposing resident records."
  },
  {
    name: "Housekeeping & Dining",
    roles: "Housekeeping, dining support, laundry, cleaner",
    detail: "Operational support roles for daily residence coverage and urgent absence replacement."
  },
  {
    name: "Maintenance",
    roles: "Facility support, repairs, porter, urgent support",
    detail:
      "Facility requests with clear access limits, safety expectations, and supervisor handoff."
  }
] as const;

export const workerBenefits = [
  "Private offer visibility",
  "Exact terms versions",
  "Owned assignment schedule",
  "Authenticated access",
  "Mobile-first reference",
  "Truthful empty states"
] as const;

export const workerJourney = [
  "Sign in",
  "Review owned offer",
  "Accept or decline",
  "See confirmed assignment",
  "Continue to attendance handoff"
] as const;

export const employerJourney = [
  "Create request",
  "Submit for review",
  "Correct if requested",
  "Track staffing progress",
  "See confirmed assignments"
] as const;

export const trustControls = [
  "Database-backed roles",
  "Tenant isolation",
  "Worker-owned records",
  "Human dispatch review",
  "Version conflict checks",
  "Attendance handoff boundary"
] as const;

export const faqPreview = [
  "How does a staffing request enter review?",
  "Who can see worker offer details?",
  "When does an offer become an assignment?",
  "Does AI assign workers?"
] as const;
