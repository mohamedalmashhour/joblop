export const staffingCategories = [
  {
    name: "Kitchen",
    roles: "Chef, kitchen aide, dishwasher",
    detail: "Food service roles with shift requirements and workplace context."
  },
  {
    name: "Care / Nurse",
    roles: "Nurse, PSW, care aide",
    detail: "Credential-aware staffing requests for supervised care environments."
  },
  {
    name: "Helper",
    roles: "Dining, housekeeping, floor support",
    detail: "Operational support roles for daily residence coverage."
  },
  {
    name: "Maintenance",
    roles: "Repairs, facility, urgent support",
    detail: "Facility support with clear access and safety expectations."
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
