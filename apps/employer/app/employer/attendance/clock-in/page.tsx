import { AttendanceStatePage } from "../AttendanceStatePage";

export default function ClockInStatePage() {
  return (
    <AttendanceStatePage
      currentRoute="/employer/attendance/clock-in"
      eyebrow="Page 048 - Clock-In State"
      state="Clocked In"
      title="Review clock-in evidence separately from attendance approval."
    />
  );
}
