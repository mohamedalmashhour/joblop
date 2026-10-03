// Navigation content for the multi-role order workflow. Kept as its own array (like the other
// workflow-content modules) so it can be added to the employer navigation without disturbing the
// existing guided sequences or their smoke tests.
export const ordersWorkflow = [
  {
    page: "O01",
    title: "Orders",
    route: "/employer/orders",
    status: "Multi-role orders",
    boundary: "Lists your staffing orders and their rolled-up status; worker pay and platform margin stay private."
  },
  {
    page: "O02",
    title: "New Order",
    route: "/employer/orders/create",
    status: "Order entry",
    boundary: "Groups several role lines into one governed submission; admin prices and approves each role separately."
  }
] as const;
