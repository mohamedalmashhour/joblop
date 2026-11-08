// Navigation content for the employer money (accountant) summary. Its own array so it slots into the
// employer navigation without disturbing the existing guided sequences or their smoke tests.
export const moneyWorkflow = [
  {
    page: "M01",
    title: "Money",
    route: "/employer/money",
    status: "Accountant summary",
    boundary: "Summarizes invoiced / paid / outstanding and links to the detail; never moves money."
  }
] as const;
