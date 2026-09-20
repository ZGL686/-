import { z } from 'zod';

const key = z.string().min(1).max(200);
export const cellSchema = z.union([
  z.string().max(4000),
  z.number().finite(),
  z.boolean(),
  z.array(z.string().max(100)).max(50),
  z.null(),
]);
export const propertySchema = z.object({
  id: key.refine((v) => v.startsWith('custom:'), '自定义属性 ID 无效'),
  name: z.string().trim().min(1).max(40),
  type: z.enum(['text', 'number', 'select', 'multiSelect', 'date', 'checkbox']),
  options: z.array(z.string().trim().min(1).max(100)).max(50).default([]),
});
export const filterSchema = z.object({
  id: key,
  property: key,
  operator: z.enum([
    'contains',
    'notContains',
    'equals',
    'notEquals',
    'gt',
    'gte',
    'lt',
    'lte',
    'empty',
    'notEmpty',
  ]),
  value: z.string().max(4000),
});
export const viewSchema = z.object({
  id: key,
  name: z.string().trim().min(1).max(50),
  layout: z.enum(['table', 'board', 'gallery', 'list', 'calendar']),
  filters: z.array(filterSchema).max(50),
  filterMode: z.enum(['and', 'or']),
  sorts: z.array(z.object({ property: key, direction: z.enum(['asc', 'desc']) })).max(20),
  groupBy: z.string().max(200),
  hidden: z.array(key),
  order: z.array(key),
  widths: z.record(key, z.number().min(80).max(600)).default({}),
  calculations: z
    .record(key, z.enum(['none', 'count', 'filled', 'unique', 'sum', 'average', 'min', 'max']))
    .default({}),
  dateProperty: z.string().max(200).default('date'),
  wrap: z.boolean().default(false),
});
export const databaseSchema = z
  .object({
    properties: z.array(propertySchema).max(50),
    cells: z.record(key, z.record(key, cellSchema)),
    views: z.array(viewSchema).min(1).max(30),
    activeViewId: key,
  })
  .superRefine((db, ctx) => {
    if (!db.views.some((v) => v.id === db.activeViewId))
      ctx.addIssue({ code: 'custom', message: '当前数据库视图不存在' });
    for (const items of [db.properties, db.views])
      if (new Set(items.map((p) => p.id)).size !== items.length)
        ctx.addIssue({ code: 'custom', message: '数据库属性或视图 ID 重复' });
    if (new Set(db.properties.map((p) => p.name)).size !== db.properties.length)
      ctx.addIssue({ code: 'custom', message: '属性名称重复' });
    for (const row of Object.values(db.cells))
      for (const [id, value] of Object.entries(row)) {
        const p = db.properties.find((p) => p.id === id);
        if (!p) {
          ctx.addIssue({ code: 'custom', message: '属性值引用了不存在的属性' });
          continue;
        }
        if (value === null || value === '') continue;
        const valid =
          p.type === 'number'
            ? typeof value === 'number'
            : p.type === 'checkbox'
              ? typeof value === 'boolean'
              : p.type === 'multiSelect'
                ? Array.isArray(value) && value.every((v) => p.options.includes(v))
                : typeof value === 'string' &&
                  (p.type !== 'select' || p.options.includes(value)) &&
                  (p.type !== 'date' ||
                    (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
                      !Number.isNaN(Date.parse(value)) &&
                      new Date(value).toISOString().slice(0, 10) === value));
        if (!valid) ctx.addIssue({ code: 'custom', message: `属性“${p.name}”的值不符合类型` });
      }
  });
export type CellValue = z.infer<typeof cellSchema>;
export type CustomProperty = z.infer<typeof propertySchema>;
export type DatabaseView = z.infer<typeof viewSchema>;
export type DatabaseState = z.infer<typeof databaseSchema>;
export type Filter = z.infer<typeof filterSchema>;
export type DatabaseKind = 'students' | 'records';
export function makeView(
  id: string,
  name: string,
  layout: DatabaseView['layout'] = 'table',
): DatabaseView {
  return {
    id,
    name,
    layout,
    filters: [],
    filterMode: 'and',
    sorts: [],
    groupBy: '',
    hidden: [],
    order: [],
    widths: {},
    calculations: {},
    dateProperty: 'date',
    wrap: false,
  };
}
export function defaultDatabase(kind: DatabaseKind): DatabaseState {
  const table = makeView('table', kind === 'students' ? '全部同学' : '全部记录');
  table.hidden = kind === 'students' ? ['group', 'custom:remark'] : ['room', 'teacher'];
  table.widths =
    kind === 'students'
      ? {
          name: 180,
          number: 155,
          'custom:followup': 125,
          total: 90,
          'count:leave': 80,
          'count:absent': 80,
          'count:late': 80,
          'count:early': 80,
        }
      : {
          title: 200,
          studentId: 105,
          category: 100,
          date: 120,
          time: 85,
          courseName: 190,
          note: 160,
          voided: 80,
        };
  if (kind === 'records')
    table.filters = [{ id: 'valid', property: 'voided', operator: 'equals', value: 'false' }];
  const board = {
    ...structuredClone(table),
    id: 'board',
    name: kind === 'students' ? '跟进看板' : '按类型',
    layout: 'board' as const,
    groupBy: kind === 'students' ? 'custom:followup' : 'category',
  };
  const gallery = {
    ...structuredClone(table),
    id: 'gallery',
    name: kind === 'students' ? '同学画廊' : '记录画廊',
    layout: 'gallery' as const,
  };
  if (kind === 'students') {
    board.hidden = [
      'group',
      'custom:remark',
      'count:leave',
      'count:absent',
      'count:late',
      'count:early',
    ];
    gallery.hidden = ['custom:remark', 'count:leave', 'count:absent', 'count:late', 'count:early'];
  } else board.hidden = ['studentId', 'time', 'room', 'teacher', 'voided', 'note'];
  const calendar = {
    ...structuredClone(table),
    id: 'calendar',
    name: '考勤日历',
    layout: 'calendar' as const,
  };
  return {
    properties:
      kind === 'students'
        ? [
            {
              id: 'custom:followup',
              name: '跟进状态',
              type: 'select',
              options: ['未跟进', '跟进中', '已完成'],
            },
            { id: 'custom:remark', name: '备注', type: 'text', options: [] },
          ]
        : [],
    cells: {},
    views: kind === 'students' ? [table, board, gallery] : [table, board, calendar],
    activeViewId: 'table',
  };
}
