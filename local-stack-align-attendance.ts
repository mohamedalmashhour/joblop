// LOCAL dev helper: set the demo attendance check-in/out to EXACTLY the timesheet's snapshotted
// scheduled window, so recalculate clears early_arrival/early_departure (the timesheet immutably
// snapshotted scheduledStartAt/EndAt at creation and can't be deleted — audit-protected — so the
// attendance must match that window). After this, a recalculate → clean 480 min → worker_review.
// TEST/SYNTHETIC — no money moves.
//   Run on the Mac:  cd "/Volumes/Danny SSD/Codex/resident-workforce-os" \
//     && DATABASE_URL="postgresql://$USER@localhost:5432/$(sed -n 's/^DB: //p' local-stack-info.txt)" \
//        TIMESHEET_ID=29d29084-9a44-4118-944e-74ba62bbc29f \
//        node --import tsx local-stack-align-attendance.ts
import { createPrismaClient } from "@rwos/database";

async function main() {
  const url = process.env.DATABASE_URL;
  const timesheetId = process.env.TIMESHEET_ID;
  if (!url || !timesheetId) { console.error("need DATABASE_URL + TIMESHEET_ID"); process.exit(1); }
  const c: any = createPrismaClient(url);
  const ts = await c.timesheet.findUnique({ where: { id: timesheetId } });
  if (!ts) { console.log("no timesheet", timesheetId); return; }
  const startAt = ts.scheduledStartAt;
  const endAt = ts.scheduledEndAt;
  await c.attendanceRecord.update({
    where: { id: ts.attendanceRecordId },
    data: { checkInAt: startAt, checkOutAt: endAt, status: "completed" }
  });
  console.log("ALIGN_ATTENDANCE_OK", JSON.stringify({ attendanceRecordId: ts.attendanceRecordId, checkInAt: startAt, checkOutAt: endAt }));
  console.log("NEXT: request-correction → calculate → clean 480 min, no exception → worker_review.");
}
main().catch((e) => { console.error("ALIGN_ATTENDANCE_ERROR", e); process.exit(1); });
