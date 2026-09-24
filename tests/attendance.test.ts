import { describe, expect, it } from 'vitest';
import { initialData } from '../src/seed';
import type { AttendanceRecord } from '../src/model';
import { counts } from '../src/model';
import { sameSession, setRecordsVoided } from '../src/features/attendance/model';

describe('attendance corrections', () => {
  it('undoes exact records, supports batch restore and preserves snapshots and custom properties', () => {
    const w = initialData([{ id: 's1', name: '虚构同学', number: 'TEST1', group: '' }])
      .workspaces[0];
    const record: AttendanceRecord = {
      id: 'a',
      studentId: 's1',
      category: 'late',
      date: '2026-09-24',
      time: '10:00',
      courseId: 'c',
      courseName: '验收课',
      room: '教室',
      teacher: '教师',
      note: '保留备注',
      createdAt: '2026-09-24T02:00:00Z',
      updatedAt: '',
      voided: false,
    };
    w.records = [record, { ...record, id: 'b' }, { ...record, id: 'c', date: '2026-09-23' }];
    w.databases.records.cells.a = { 'custom:note': '原自定义内容' };
    const before = structuredClone(w);
    setRecordsVoided(w, ['a', 'b'], true);
    expect(counts(w, 's1').late).toBe(1);
    expect(w.records[2]).toEqual(before.records[2]);
    setRecordsVoided(w, ['a', 'b'], false);
    expect(counts(w, 's1').late).toBe(3);
    expect(w.records[0]).toEqual({ ...before.records[0], updatedAt: w.records[0].updatedAt });
    expect(w.databases.records.cells).toEqual(before.databases.records.cells);
    const current = structuredClone(w);
    expect(() => setRecordsVoided(w, ['a', 'missing'], true)).toThrow();
    expect(w).toEqual(current);
  });
  it('matches scheduled courses by ID and temporary courses by name and date', () => {
    const s = { date: '2026-09-24', time: '10:00', courseId: 'course1', courseName: '同名课程' };
    expect(sameSession({ ...s, courseId: 'course2' }, s)).toBe(false);
    expect(sameSession({ ...s, time: '10:05' }, s)).toBe(true);
    expect(sameSession({ ...s, date: '2026-09-23' }, s)).toBe(false);
    expect(
      sameSession({ ...s, courseId: '' }, { ...s, courseId: '', courseName: ' 同名课程 ' }),
    ).toBe(true);
  });
});
