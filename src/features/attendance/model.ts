import type { Session, Workspace } from '../../model';

/** Retain record snapshots and custom properties for a lossless undo/restore. */
export function setRecordsVoided(w: Workspace, ids: string[], voided: boolean) {
  const unique = new Set(ids);
  if (!unique.size || [...unique].some((id) => !w.records.some((r) => r.id === id)))
    throw new Error('记录不存在，请重新打开考勤明细。');
  const changedAt = new Date().toISOString();
  for (const record of w.records) {
    if (unique.has(record.id) && record.voided !== voided) {
      record.voided = voided;
      record.updatedAt = changedAt;
    }
  }
}

export function sameSession(record: Session, session: Session) {
  return (
    record.date === session.date &&
    (session.courseId
      ? record.courseId === session.courseId
      : !record.courseId && record.courseName === session.courseName.trim())
  );
}
