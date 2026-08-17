import { AttendanceStatePage } from "../AttendanceStatePage";

export default function AttendanceExceptionReviewPage() {
  return (
    <AttendanceStatePage
      currentRoute="/employer/attendance/exceptions"
      eyebrow="Attendance Exception Review"
      state="Manual Review Required"
      title="Review attendance exceptions without automatic misconduct conclusions."
    />
  );
}
