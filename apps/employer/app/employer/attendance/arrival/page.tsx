import { AttendanceStatePage } from "../AttendanceStatePage";

export default function ArrivalStatePage() {
  return (
    <AttendanceStatePage
      currentRoute="/employer/attendance/arrival"
      eyebrow="Arrival State"
      state="Arrived"
      title="Review arrival state without treating arrival as clock-in."
    />
  );
}
