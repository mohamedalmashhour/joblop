export const staffingCategories = [
  {
    name: "Kitchen",
    roles: "Chef diplômé, Sous-chef, Cuisinier, Aide-cuisinier, Dishwasher",
    detail: "Food service coverage with shift requirements, food-safety context, and kitchen handoff notes."
  },
  {
    name: "Care / Nurse",
    roles: "Préposé(e) aux bénéficiaires, Nurse, care aide",
    detail: "Credential-aware requests for supervised care environments without exposing resident records."
  },
  {
    name: "Housekeeping & Dining",
    roles: "Housekeeping, dining support, laundry, cleaner",
    detail: "Operational support roles for daily residence coverage and urgent absence replacement."
  },
  {
    name: "Maintenance",
    roles: "Facility support, repairs, porter, urgent support",
    detail: "Facility requests with clear access limits, safety expectations, and supervisor handoff."
  }
] as const;

export const workerBenefits = [
  "Flexible scheduling",
  "Fast shift matching",
  "Transparent earnings",
  "Verified employers",
  "Mobile-first experience",
  "Professional growth"
] as const;

export const workerJourney = [
  "Discover shifts",
  "Apply",
  "Get approved",
  "Work",
  "Get paid"
] as const;

export const employerJourney = [
  "Request staff",
  "AI-assisted matching",
  "Review candidates",
  "Confirm assignment",
  "Track shift",
  "Approve timesheet"
] as const;

export const trustControls = [
  "Verified Healthcare Workers",
  "Credential Verification",
  "Background Checks",
  "Compliance Monitoring",
  "Attendance Verification",
  "Quality Assurance"
] as const;

export const faqPreview = [
  "How fast can I request staff?",
  "How are workers verified?",
  "Who approves payment?",
  "Does AI assign workers?"
] as const;
