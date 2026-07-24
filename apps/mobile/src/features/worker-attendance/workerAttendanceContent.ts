export type WorkerAttendanceStage =
  | "overview"
  | "arrival"
  | "clockIn"
  | "inProgress"
  | "break"
  | "clockOut"
  | "review";

export const workerAttendanceStages: readonly Readonly<{
  id: WorkerAttendanceStage;
  title: string;
  status: string;
  purpose: string;
}>[] = [
  {
    id: "overview",
    purpose: "Shows the upcoming assignment and what the worker needs to do next.",
    status: "Scheduled",
    title: "Upcoming Assignment"
  },
  {
    id: "arrival",
    purpose: "Shows arrival guidance without continuous tracking.",
    status: "Arrival Window",
    title: "Arrival"
  },
  {
    id: "clockIn",
    purpose: "Collects a deliberate worker check-in action for the fixture.",
    status: "Ready to Clock In",
    title: "Clock In"
  },
  {
    id: "inProgress",
    purpose: "Shows active-shift context and support boundaries.",
    status: "In Progress",
    title: "Shift In Progress"
  },
  {
    id: "break",
    purpose: "Represents governed break visibility without payroll calculation.",
    status: "Break Logged",
    title: "Break"
  },
  {
    id: "clockOut",
    purpose: "Collects a deliberate worker check-out action for the fixture.",
    status: "Ready to Clock Out",
    title: "Clock Out"
  },
  {
    id: "review",
    purpose: "Hands attendance evidence to the timesheet review workflow.",
    status: "Attendance Review",
    title: "Review Attendance"
  }
];

export const workerAttendanceStateModel = [
  "Scheduled",
  "Arrival Window",
  "Ready to Clock In",
  "Clocked In",
  "In Progress",
  "On Break",
  "Clocked Out",
  "Completed",
  "Late",
  "Missed Clock-In",
  "Missed Clock-Out",
  "Exception Review",
  "No Show",
  "Cancelled",
  "Replacement Required"
] as const;

export const workerAttendanceBoundaries = [
  "Assignment accepted != attendance",
  "Clock-in != approved hours",
  "Clock-out != timesheet approval",
  "Attendance review != payroll",
  "Exception review != worker fault"
] as const;

export const workerAttendancePrivacyRules = [
  "No continuous location tracking is represented",
  "Arrival guidance uses fixture-backed workplace details",
  "GPS, device and evidence capture require future backend integration",
  "Employer visibility is limited to attendance status and governed exceptions"
] as const;

export function getAttendanceStage(stage: WorkerAttendanceStage) {
  return workerAttendanceStages.find((item) => item.id === stage) ?? workerAttendanceStages[0]!;
}

