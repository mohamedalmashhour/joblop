import { AttendanceStatePage } from "../AttendanceStatePage";

export default function ClockOutStatePage() {
  return (
    <AttendanceStatePage
      currentRoute="/employer/attendance/clock-out"
      eyebrow="Clock-Out State"
      state="Clocked Out"
      title="Review clock-out state before any timesheet approval."
    />
  );
}
