import { z } from 'zod';

const id = z.string().min(1).max(200);
const text = z.string().max(2000);
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) => !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v,
    '日期无效',
  );
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const studentSchema = z.object({
  id,
  number: z.string().min(1).max(100),
  name: z.string().min(1).max(100),
  group: text,
});
export const courseSchema = z
  .object({
    id,
    name: z.string().min(1).max(100),
    teacher: text,
    room: text,
    day: z.number().int().min(1).max(7),
    start: z.number().int().min(1).max(10),
    end: z.number().int().min(1).max(10),
    weeks: z.array(z.number().int().min(1).max(30)).min(1),
    color: z.enum(['purple', 'blue', 'pink', 'green', 'amber', 'teal']),
  })
  .refine((c) => c.end >= c.start, '结束节次不能早于开始节次');
export const recordSchema = z.object({
  id,
  studentId: id,
  category: id,
  date: dateSchema,
  time,
  courseId: text,
  courseName: z.string().min(1).max(200),
  room: text,
  teacher: text,
  note: text,
  createdAt: z.string(),
  updatedAt: z.string(),
  voided: z.boolean(),
});
export const workspaceSchema = z
  .object({
    id,
    name: z.string().min(1).max(100),
    term: z.string().min(1).max(100),
    startDate: dateSchema,
    totalWeeks: z.number().int().min(1).max(30),
    students: z.array(studentSchema),
    courses: z.array(courseSchema),
    records: z.array(recordSchema),
    categories: z
      .array(z.object({ id, label: z.string().min(1).max(30), color: text }))
      .min(1)
      .max(12),
    periods: z.array(z.object({ start: time, end: time })).length(10),
    notes: text,
  })
  .superRefine((w, ctx) => {
    const unique = (vals: string[], label: string) => {
      if (new Set(vals).size !== vals.length)
        ctx.addIssue({ code: 'custom', message: `${label}重复` });
    };
    unique(
      w.students.map((s) => s.id),
      '学生 ID',
    );
    unique(
      w.students.map((s) => s.number),
      '学号',
    );
    unique(
      w.courses.map((c) => c.id),
      '课程 ID',
    );
    unique(
      w.records.map((r) => r.id),
      '记录 ID',
    );
    unique(
      w.categories.map((c) => c.id),
      '考勤类型 ID',
    );
    for (const r of w.records)
      if (
        !w.students.some((s) => s.id === r.studentId) ||
        !w.categories.some((c) => c.id === r.category)
      )
        ctx.addIssue({ code: 'custom', message: '考勤记录引用了不存在的学生或类型' });
    w.periods.forEach((p, i) => {
      if (p.start >= p.end || (i > 0 && p.start < w.periods[i - 1].end))
        ctx.addIssue({ code: 'custom', message: '作息时间需按先后顺序排列，且结束晚于开始' });
    });
  });
export const dataSchema = z
  .object({
    schemaVersion: z.literal(1),
    activeWorkspaceId: id,
    workspaces: z.array(workspaceSchema).min(1),
  })
  .superRefine((d, ctx) => {
    if (!d.workspaces.some((w) => w.id === d.activeWorkspaceId))
      ctx.addIssue({ code: 'custom', message: '当前工作台不存在' });
    if (new Set(d.workspaces.map((w) => w.id)).size !== d.workspaces.length)
      ctx.addIssue({ code: 'custom', message: '工作台 ID 重复' });
  });
export type Student = z.infer<typeof studentSchema>;
export type Course = z.infer<typeof courseSchema>;
export type AttendanceRecord = z.infer<typeof recordSchema>;
export type Workspace = z.infer<typeof workspaceSchema>;
export type AppData = z.infer<typeof dataSchema>;
export const uid = () => crypto.randomUUID();
export const categories: Workspace['categories'] = [
  { id: 'leave', label: '请假', color: 'blue' },
  { id: 'absent', label: '旷课', color: 'pink' },
  { id: 'late', label: '迟到', color: 'amber' },
  { id: 'early', label: '早退', color: 'purple' },
];
export const periods: Workspace['periods'] = [
  ['08:00', '08:45'],
  ['08:55', '09:40'],
  ['10:00', '10:45'],
  ['10:55', '11:40'],
  ['14:40', '15:25'],
  ['15:35', '16:20'],
  ['16:30', '17:15'],
  ['17:20', '18:00'],
  ['20:00', '20:45'],
  ['20:55', '21:40'],
].map(([start, end]) => ({ start, end }));
export function beijingNow(now = new Date()) {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const p = (type: string) => parts.find((p) => p.type === type)!.value;
  return { date: `${p('year')}-${p('month')}-${p('day')}`, time: `${p('hour')}:${p('minute')}` };
}
export function addDays(date: string, n: number) {
  return new Date(Date.parse(date + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
}
export function weekday(date: string) {
  return new Date(date + 'T00:00:00Z').getUTCDay() || 7;
}
export function monday(date: string) {
  return addDays(date, 1 - weekday(date));
}
export function weekOf(start: string, date: string) {
  return Math.floor((Date.parse(date) - Date.parse(monday(start))) / 604800000) + 1;
}
export function weekDates(w: Workspace, week: number) {
  return Array.from({ length: 7 }, (_, i) => addDays(monday(w.startDate), (week - 1) * 7 + i));
}
export function parseWeeks(value: string): number[] {
  const clean = value
    .replace(/[周第\s]/g, '')
    .replace(/[，、]/g, ',')
    .replace(/[~～—–]/g, '-');
  if (!/^\d+(-\d+)?(,\d+(-\d+)?)*$/.test(clean)) throw new Error('周次格式示例：1-2,4-13');
  const result: number[] = [];
  for (const p of clean.split(',')) {
    const [a, b = a] = p.split('-').map(Number);
    if (a < 1 || b > 30 || b < a) throw new Error('周次需在 1–30 内，结束不小于开始');
    for (let i = a; i <= b; i++) result.push(i);
  }
  return [...new Set(result)].sort((a, b) => a - b);
}
export function formatWeeks(weeks: number[]) {
  const sorted = [...new Set(weeks)].sort((a, b) => a - b);
  const parts: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i];
    let b = a;
    while (sorted[i + 1] === b + 1) b = sorted[++i];
    parts.push(a === b ? `${a}` : `${a}-${b}`);
  }
  return parts.join(',');
}
export function coursesOn(w: Workspace, date: string) {
  const week = weekOf(w.startDate, date);
  return w.courses
    .filter((c) => c.day === weekday(date) && c.weeks.includes(week) && week <= w.totalWeeks)
    .sort((a, b) => a.start - b.start);
}
export function matchCourse(w: Workspace, date: string, time: string) {
  return coursesOn(w, date).find(
    (c) => w.periods[c.start - 1].start <= time && w.periods[c.end - 1].end >= time,
  );
}
export function counts(
  w: Workspace,
  studentId?: string,
  from = '',
  to = '9999-12-31',
  course = '',
) {
  return Object.fromEntries(
    w.categories.map((c) => [
      c.id,
      w.records.filter(
        (r) =>
          !r.voided &&
          r.category === c.id &&
          (!studentId || r.studentId === studentId) &&
          r.date >= from &&
          r.date <= to &&
          (!course || r.courseName === course),
      ).length,
    ]),
  );
}
export function newWorkspace(name: string, students: Student[] = []): Workspace {
  return {
    id: uid(),
    name,
    term: '2026–2027 第一学期',
    startDate: '2026-09-07',
    totalWeeks: 20,
    students,
    courses: [],
    records: [],
    categories: structuredClone(categories),
    periods: structuredClone(periods),
    notes: '',
  };
}
export function importAsCopies(current: AppData, incoming: AppData): AppData {
  const copies = incoming.workspaces.map((w) => ({
    ...structuredClone(w),
    id: uid(),
    name: `${w.name}（恢复副本）`,
  }));
  return dataSchema.parse({
    ...current,
    workspaces: [...current.workspaces, ...copies],
    activeWorkspaceId: copies[0].id,
  });
}
