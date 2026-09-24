import { describe, it, expect } from 'vitest';
import { initialData } from '../src/seed';
import {
  beijingNow,
  weekOf,
  parseWeeks,
  formatWeeks,
  coursesOn,
  matchCourse,
  dataSchema,
  importAsCopies,
  counts,
  uid,
} from '../src/model';
import { createBackup, parseBackup, parseCsv, markdownReport, excelReport } from '../src/files';
import ExcelJS from 'exceljs';
const sample = () =>
  initialData([{ id: 's1', number: '00123', name: '测试同学', group: '测试班' }]);
describe('teaching week and Beijing matching', () => {
  it('uses Beijing day across UTC midnight boundary', () => {
    expect(beijingNow(new Date('2026-09-20T16:30:00Z'))).toEqual({
      date: '2026-09-21',
      time: '00:30',
    });
  });
  it('changes at Monday and normalizes a non-Monday start date', () => {
    expect(weekOf('2026-09-07', '2026-09-20')).toBe(2);
    expect(weekOf('2026-09-07', '2026-09-21')).toBe(3);
    expect(weekOf('2026-09-09', '2026-09-07')).toBe(1);
    expect(weekOf('2026-09-07', '2026-09-06')).toBe(0);
  });
  it('parses discontinuous ranges and rejects reversed/invalid ranges', () => {
    expect(parseWeeks('1-2,4-6')).toEqual([1, 2, 4, 5, 6]);
    expect(formatWeeks([1, 2, 4, 5, 6])).toBe('1-2,4-6');
    for (const v of ['0', '3-2', '31', 'NaN', '1,']) expect(() => parseWeeks(v)).toThrow();
  });
  it('honors week 3 gap and replacement course at week 14', () => {
    const w = sample().workspaces[0];
    expect(coursesOn(w, '2026-09-21')).toHaveLength(0);
    expect(coursesOn(w, '2026-12-07').map((c) => c.name)).toEqual(['三维基础建模课程设计']);
    expect(coursesOn(w, '2026-09-20')).toHaveLength(0);
  });
  it('matches exact course slots without inventing a course outside class time', () => {
    const w = sample().workspaces[0];
    expect(matchCourse(w, '2026-09-16', '10:10')?.name).toBe('计算机程序设计');
    expect(matchCourse(w, '2026-09-16', '12:30')).toBeUndefined();
  });
});
describe('data and backup integrity', () => {
  it('round-trips backup and rejects tampering', async () => {
    const data = sample();
    const backup = await createBackup(data);
    expect(await parseBackup(backup)).toEqual(data);
    const edited = JSON.parse(backup);
    edited.data.workspaces[0].name = 'modified';
    await expect(parseBackup(JSON.stringify(edited))).rejects.toThrow('校验');
  });
  it('rejects future schema, orphan records, duplicate student numbers and bad dates', () => {
    const data = sample();
    expect(() => dataSchema.parse({ ...data, schemaVersion: 4 })).toThrow();
    const w = data.workspaces[0];
    w.students.push({ ...w.students[0], id: 's2' });
    expect(() => dataSchema.parse(data)).toThrow();
    w.students.pop();
    w.startDate = '2026-02-31';
    expect(() => dataSchema.parse(data)).toThrow();
  });
  it('restores copies without mutating original workspaces', () => {
    const data = sample();
    const incoming = sample();
    const before = structuredClone(data);
    const restored = importAsCopies(data, incoming);
    expect(restored.workspaces).toHaveLength(2);
    expect(restored.workspaces[0]).toEqual(before.workspaces[0]);
    expect(data).toEqual(before);
    expect(restored.activeWorkspaceId).not.toBe(incoming.activeWorkspaceId);
  });
  it('ignores voided entries and filters by date and course', () => {
    const data = sample();
    const w = data.workspaces[0];
    const base = {
      id: uid(),
      studentId: 's1',
      category: 'late',
      date: '2026-09-16',
      time: '10:00',
      courseId: '',
      courseName: '测试课程',
      room: '',
      teacher: '',
      note: '',
      createdAt: '',
      updatedAt: '',
      voided: false,
    };
    w.records.push(
      base,
      { ...base, id: uid(), voided: true },
      { ...base, id: uid(), date: '2026-09-17' },
    );
    expect(counts(w, 's1', '2026-09-16', '2026-09-16', '测试课程').late).toBe(1);
    expect(counts(w).late).toBe(2);
  });
});
describe('reports and CSV', () => {
  it('parses quoted CSV including newlines and escaped quotes', () => {
    expect(parseCsv('姓名,学号\r\n"同,学",00123\r\n"双""引号",00124')).toEqual([
      ['姓名', '学号'],
      ['同,学', '00123'],
      ['双"引号', '00124'],
    ]);
  });
  it('exports both sheets, preserves identifier zeroes, and escapes Markdown', async () => {
    const w = sample().workspaces[0];
    w.students[0].name = '同|学';
    const f = { from: '2026-09-01', to: '2027-01-31', course: '' };
    expect(markdownReport(w, f)).toContain('同\\|学');
    const bytes = await excelReport(w, f);
    const b = new ExcelJS.Workbook();
    await b.xlsx.load(bytes as never);
    expect(b.worksheets.map((s) => s.name)).toEqual(['考勤汇总', '考勤明细']);
    expect(b.worksheets[0].getCell('A5').value).toBe('00123');
    expect(b.worksheets[0].getCell('D5').value).toBe(0);
  });
});
