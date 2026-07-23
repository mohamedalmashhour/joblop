export const pricingModels = [
  "Regular shift",
  "Urgent or same-day staffing",
  "Recurring staffing",
  "Long-distance assignment",
  "Managed or enterprise agreement"
] as const;

export const transparencyPrinciples = [
  "Clear estimates before booking",
  "No hidden platform charges",
  "Charges based on verified attendance",
  "Approved adjustments are visible",
  "Workers and employers have separate financial records",
  "Disputes are reviewed by people",
  "AI may assist calculations but does not make financial decisions"
] as const;

export const authorizationTimeline = [
  "Payment authorization",
  "Shift confirmed",
  "Worker check-in",
  "Worker check-out",
  "Employer timesheet review",
  "Approved adjustments",
  "Final charge calculation",
  "Invoice",
  "Settlement"
] as const;

export const estimateFlow = [
  "Estimated cost",
  "Actual hours worked",
  "Approved adjustments",
  "Final invoice"
] as const;

export const estimateComponents = [
  "Base staffing charge",
  "Urgency adjustment",
  "Travel time",
  "Mileage or transportation",
  "Taxes where applicable",
  "Approved adjustments"
] as const;

export const calculatorInputs = [
  "Role",
  "Date",
  "Start and end time",
  "Urgency",
  "Location",
  "Estimated travel",
  "Number of workers"
] as const;

export const aiFinancialBoundary = [
  "AI may organize estimate inputs.",
  "AI may flag anomalies.",
  "AI does not make financial decisions.",
  "AI does not approve charges.",
  "AI does not decide disputes.",
  "AI does not calculate payroll or provide legal, tax, accounting, or payroll advice."
] as const;

