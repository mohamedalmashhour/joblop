export type AttendanceState =
  | "Scheduled"
  | "Awaiting Arrival"
  | "Arrived"
  | "Clocked In"
  | "In Progress"
  | "On Break"
  | "Clocked Out"
  | "Completed"
  | "Late"
  | "No Show"
  | "Early Departure"
  | "Missing Clock-In"
  | "Missing Clock-Out"
  | "Manual Review Required";

export const attendanceWorkflow = [
  {
    page: "047",
    title: "Attendance Monitoring",
    route: "/employer/attendance",
    status: "Employer monitoring",
    boundary: "Attendance monitoring observes fixture states only; it does not track continuous GPS."
  },
  {
    page: "047",
    title: "Arrival State",
    route: "/employer/attendance/arrival",
    status: "Arrival visibility",
    boundary: "Arrival state is not clock-in, attendance approval, or worker misconduct."
  },
  {
    page: "048",
    title: "Clock-In State",
    route: "/employer/attendance/clock-in",
    status: "Clock event summary",
    boundary: "Clock-in state displays evidence; it does not edit or fabricate clock events."
  },
  {
    page: "048",
    title: "Shift In Progress",
    route: "/employer/attendance/in-progress",
    status: "Current shift status",
    boundary: "In-progress monitoring does not become continuous GPS or payroll approval."
  },
  {
    page: "048",
    title: "Clock-Out State",
    route: "/employer/attendance/clock-out",
    status: "Clock-out summary",
    boundary: "Clock-out state is not final timesheet approval."
  },
  {
    page: "048",
    title: "Exception Review",
    route: "/employer/attendance/exceptions",
    status: "Manual review",
    boundary: "Attendance exception does not automatically mean worker misconduct."
  },
  {
    page: "049",
    title: "Timesheet Handoff",
    route: "/employer/timesheets",
    status: "Next milestone boundary",
    boundary: "Timesheet review is separate from attendance monitoring."
  }
] as const;

export const attendanceStates: AttendanceState[] = [
  "Scheduled",
  "Awaiting Arrival",
  "Arrived",
  "Clocked In",
  "In Progress",
  "On Break",
  "Clocked Out",
  "Completed",
  "Late",
  "No Show",
  "Early Departure",
  "Missing Clock-In",
  "Missing Clock-Out",
  "Manual Review Required"
];

export const attendanceFixture = {
  assignment: "Kitchen evening support",
  worker: "Assigned worker fixture",
  residence: "Maple Residence",
  department: "Kitchen",
  scheduledStart: "2026-07-24 15:00",
  scheduledEnd: "2026-07-24 23:00",
  actualArrival: "2026-07-24 14:54 fixture",
  actualClockIn: "2026-07-24 15:03 fixture",
  actualClockOut: "Pending fixture",
  source: "Worker app clock event fixture",
  freshness: "Fixture refreshed locally; no live feed",
  exceptionStatus: "Manual Review Required",
  managerReviewStatus: "Awaiting employer review",
  attendanceState: "In Progress" as AttendanceState
};

export const attendanceBoundaries = [
  "Scheduled time != Actual clock event",
  "Arrival != Clock-in",
  "Clock-in != Attendance approval",
  "Exception != Worker misconduct",
  "Clock-out != Approved timesheet",
  "Attendance != Payroll",
  "Employer monitoring != Continuous GPS tracking"
] as const;

export const attendanceDataTruth = [
  "Fixture-backed attendance data",
  "No fabricated live location",
  "No continuous GPS tracking",
  "No fabricated clock events",
  "No server attendance persistence",
  "Timesheet integration pending"
] as const;

export const attendanceEvidenceRows = [
  {
    label: "Scheduled start",
    value: attendanceFixture.scheduledStart,
    source: "Published shift fixture"
  },
  {
    label: "Actual arrival",
    value: attendanceFixture.actualArrival,
    source: attendanceFixture.source
  },
  {
    label: "Actual clock-in",
    value: attendanceFixture.actualClockIn,
    source: attendanceFixture.source
  },
  {
    label: "Actual clock-out",
    value: attendanceFixture.actualClockOut,
    source: "No clock-out fixture yet"
  }
] as const;

export function getAttendanceStateSummary(state: AttendanceState) {
  return {
    state,
    requiresReview: ["Late", "No Show", "Early Departure", "Missing Clock-In", "Missing Clock-Out", "Manual Review Required"].includes(state),
    canCreateTimesheetDraft: ["Clocked Out", "Completed", "Manual Review Required"].includes(state),
    isPayrollReady: false
  };
}
