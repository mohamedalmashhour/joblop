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
  workerSignup: "rwos://worker/signup",
  workerProfileSetup: "rwos://worker/onboarding/profile",
  workerQualificationsSetup: "rwos://worker/onboarding/qualifications",
  workerAvailabilitySetup: "rwos://worker/onboarding/availability",
  workerOnboardingReview: "rwos://worker/onboarding/review",
  workerAttendance: "rwos://worker/assignments/:assignmentId/attendance",
  workerTimesheet: "rwos://worker/assignments/:assignmentId/timesheet",
  filters: "rwos://worker/available/filters",
  calendar: "rwos://worker/calendar",
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
    id: "calendar",
    label: "Calendar",
    routeName: mobileRouteNames.calendar,
    status: "Worker calendar and availability"
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
