import { AttendanceStatePage } from "../AttendanceStatePage";

export default function ShiftInProgressPage() {
  return (
    <AttendanceStatePage
      currentRoute="/employer/attendance/in-progress"
      eyebrow="Shift In Progress"
      state="In Progress"
      title="Monitor shift-in-progress state without live GPS or payroll conclusions."
    />
  );
}
