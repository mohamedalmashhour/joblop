export const productName = "Resident Workforce OS";

export const mobileRouteNames = {
  home: "rwos://worker/home",
  available: "rwos://worker/available",
  shiftDetails: "rwos://worker/available/:shiftId",
  applicationSummary: "rwos://worker/available/:shiftId/apply",
  applicationSuccess: "rwos://worker/applications/:applicationId/success",
  applicationDetails: "rwos://worker/applications/:applicationId",
  offerDetails: "rwos://worker/offers/:offerId",
  confirmationDetails: "rwos://worker/confirmations/:confirmationId",
  filters: "rwos://worker/available/filters",
  myShifts: "rwos://worker/my-shifts",
  billing: "rwos://worker/billing",
  profile: "rwos://worker/profile",
  notifications: "rwos://worker/notifications"
} as const;

export const mobileTabs = [
  { id: "home", label: "Home", routeName: mobileRouteNames.home, status: "Shell route only" },
  {
    id: "available",
    label: "Available",
    routeName: mobileRouteNames.available,
    status: "G01 shift discovery"
  },
  {
    id: "my-shifts",
    label: "My Shifts",
    routeName: mobileRouteNames.myShifts,
    status: "G02 applications, offers and confirmations"
  },
  {
    id: "billing",
    label: "Billing",
    routeName: mobileRouteNames.billing,
    status: "Reserved for G04"
  },
  {
    id: "profile",
    label: "Profile",
    routeName: mobileRouteNames.profile,
    status: "Worker identity foundation only"
  },
  {
    id: "notifications",
    label: "Notifications",
    routeName: mobileRouteNames.notifications,
    status: "Reserved notification center"
  }
] as const;

export type MobileTabId = (typeof mobileTabs)[number]["id"];
export type MobileRouteName = (typeof mobileRouteNames)[keyof typeof mobileRouteNames];
