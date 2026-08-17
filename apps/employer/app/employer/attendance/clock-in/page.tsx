import { AttendanceStatePage } from "../AttendanceStatePage";

export default function ClockInStatePage() {
  return (
    <AttendanceStatePage
      currentRoute="/employer/attendance/clock-in"
      eyebrow="Clock-In State"
      state="Clocked In"
      title="Review clock-in evidence separately from attendance approval."
    />
  );
}
