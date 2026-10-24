// LOCAL dev helper: align the demo job's shift window AND its attendance to the SAME real,
// completed shift in the past (yesterday 09:00–17:00), and clear the derived timesheet, so a
// fresh timesheet calculates 480 clean minutes with NO early_arrival/early_departure exception
// and can flow worker-confirm → employer-confirm → platform approve. TEST/SYNTHETIC — no money.
//   Run on the Mac:  cd "/Volumes/Danny SSD/Codex/resident-workforce-os" \
//     && DATABASE_URL="postgresql://$USER@localhost:5432/$(sed -n 's/^DB: //p' local-stack-info.txt)" \
//        ATTENDANCE_RECORD_ID=a4e48361-b039-4752-bbbd-86f529337401 \
//        node --import tsx local-stack-realistic-shift.ts
import { createPrismaClient } from "@rwos/database";

async function main() {
  const url = process.env.DATABASE_URL;
  const attendanceRecordId = process.env.ATTENDANCE_RECORD_ID;
  if (!url || !attendanceRecordId) { console.error("need DATABASE_URL + ATTENDANCE_RECORD_ID"); process.exit(1); }
  const c: any = createPrismaClient(url);

  const att = await c.attendanceRecord.findUnique({ where: { id: attendanceRecordId } });
  if (!att) { console.log("no attendance record", attendanceRecordId); return; }
  const assignmentId: string = att.assignmentId;
  const assignment = await c.assignment.findUnique({ where: { id: assignmentId } });
  const jobRequestId: string | undefined = assignment?.jobRequestId ?? att.jobRequestId;

  // Yesterday 09:00 -> 17:00 local, as UTC instants (server compares attendance to the shift window).
  const base = new Date(); base.setDate(base.getDate() - 1);
  const startAt = new Date(base); startAt.setHours(9, 0, 0, 0);
  const endAt = new Date(base); endAt.setHours(17, 0, 0, 0);

  if (jobRequestId) {
    await c.jobRequest.update({ where: { id: jobRequestId }, data: { startAt, endAt } }).catch((e: any) => console.log("job update skip", e.message));
  }
  await c.attendanceRecord.update({
    where: { id: attendanceRecordId },
    data: { checkInAt: startAt, checkOutAt: endAt, status: "completed" }
  });
  // Clear any derived timesheet so a fresh create snapshots the aligned window.
  const byAtt = await c.timesheet.deleteMany({ where: { attendanceRecordId } }).catch(() => ({ count: 0 }));
  const byAsg = await c.timesheet.deleteMany({ where: { assignmentId } }).catch(() => ({ count: 0 }));

  console.log("REALISTIC_SHIFT_OK", JSON.stringify({ jobRequestId, assignmentId, attendanceRecordId, startAt, endAt, timesheetsRemoved: (byAtt.count || 0) + (byAsg.count || 0) }));
  console.log("NEXT: create + calculate a fresh timesheet → 480 clean minutes → worker_review (no exception).");
}
main().catch((e) => { console.error("REALISTIC_SHIFT_ERROR", e); process.exit(1); });
