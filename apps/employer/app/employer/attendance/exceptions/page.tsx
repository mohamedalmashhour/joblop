import { AttendanceStatePage } from "../AttendanceStatePage";

export default function AttendanceExceptionReviewPage() {
  return (
    <AttendanceStatePage
      currentRoute="/employer/attendance/exceptions"
      eyebrow="Page 048 - Attendance Exception Review"
      state="Manual Review Required"
      title="Review attendance exceptions without automatic misconduct conclusions."
    />
  );
}
