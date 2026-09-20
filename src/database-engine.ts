import type { Workspace } from './model';
import { counts } from './model';
import type {
  CellValue,
  CustomProperty,
  DatabaseKind,
  DatabaseView,
  Filter,
} from './database-schema';
export type Property = Omit<CustomProperty, 'type' | 'options'> & {
  type: CustomProperty['type'] | 'title' | 'relation' | 'rollup';
  options?: string[];
  labels?: Record<string, string>;
  readonly?: boolean;
  color?: Record<string, string>;
};
export type DatabaseRow = { id: string; values: Record<string, CellValue> };
export function propertiesFor(w: Workspace, kind: DatabaseKind): Property[] {
  const custom = w.databases[kind].properties;
  if (kind === 'students')
    return [
      { id: 'name', name: '姓名', type: 'title' },
      { id: 'number', name: '学号', type: 'text' },
      { id: 'group', name: '班级', type: 'text' },
      ...custom.filter((p) => p.id === 'custom:followup'),
      ...w.categories.map((c) => ({
        id: `count:${c.id}`,
        name: c.label,
        type: 'rollup' as const,
        readonly: true,
      })),
      { id: 'total', name: '异常累计', type: 'rollup', readonly: true },
      ...custom.filter((p) => p.id !== 'custom:followup'),
    ];
  return [
    { id: 'title', name: '考勤记录', type: 'title', readonly: true },
    {
      id: 'studentId',
      name: '同学',
      type: 'relation',
      options: w.students.map((s) => s.id),
      labels: Object.fromEntries(w.students.map((s) => [s.id, s.name])),
    },
    {
      id: 'category',
      name: '考勤类型',
      type: 'select',
      options: w.categories.map((c) => c.id),
      labels: Object.fromEntries(w.categories.map((c) => [c.id, c.label])),
      color: Object.fromEntries(w.categories.map((c) => [c.id, c.color])),
    },
    { id: 'date', name: '日期', type: 'date' },
    { id: 'time', name: '时间', type: 'text' },
    { id: 'courseName', name: '课程', type: 'relation', readonly: true },
    { id: 'note', name: '备注', type: 'text' },
    { id: 'voided', name: '已撤销', type: 'checkbox' },
    { id: 'room', name: '教室', type: 'text' },
    { id: 'teacher', name: '教师', type: 'text' },
    ...custom,
  ];
}
export function rowsFor(w: Workspace, kind: DatabaseKind): DatabaseRow[] {
  const db = w.databases[kind];
  const defaults = Object.fromEntries(
    db.properties.filter((p) => p.type === 'checkbox').map((p) => [p.id, false]),
  );
  if (kind === 'students')
    return w.students.map((s) => {
      const c = counts(w, s.id);
      return {
        id: s.id,
        values: {
          ...s,
          ...defaults,
          ...db.cells[s.id],
          ...Object.fromEntries(Object.entries(c).map(([id, value]) => [`count:${id}`, value])),
          total: Object.values(c).reduce((a, b) => a + b, 0),
        },
      };
    });
  return w.records.map((r) => ({
    id: r.id,
    values: {
      ...r,
      ...defaults,
      ...db.cells[r.id],
      title: `${w.students.find((s) => s.id === r.studentId)?.name ?? '未知同学'} · ${w.categories.find((c) => c.id === r.category)?.label ?? ''}`,
    },
  }));
}
export function displayValue(value: CellValue | undefined, p?: Property): string {
  if (value === undefined || value === null || value === '') return '';
  if (Array.isArray(value)) return value.map((v) => p?.labels?.[v] ?? v).join('、');
  if (typeof value === 'boolean') return value ? '是' : '否';
  return p?.labels?.[String(value)] ?? String(value);
}
export function matchesFilter(row: DatabaseRow, f: Filter, properties: Property[]) {
  const p = properties.find((p) => p.id === f.property);
  if (!p) return false;
  const value = row.values[f.property];
  const empty =
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0);
  if (f.operator === 'empty') return empty;
  if (f.operator === 'notEmpty') return !empty;
  const expected = f.value.toLocaleLowerCase();
  const actual =
    typeof value === 'boolean' ? String(value) : displayValue(value).toLocaleLowerCase();
  if (
    (p.type === 'number' || p.type === 'rollup') &&
    ['equals', 'notEquals'].includes(f.operator)
  ) {
    const equal =
      !empty &&
      f.value.trim() !== '' &&
      Number.isFinite(Number(f.value)) &&
      Number(value) === Number(f.value);
    return f.operator === 'equals' ? equal : !equal;
  }
  if (f.operator === 'equals')
    return Array.isArray(value) ? value.includes(f.value) : actual === expected;
  if (f.operator === 'notEquals')
    return Array.isArray(value) ? !value.includes(f.value) : actual !== expected;
  if (f.operator === 'contains')
    return displayValue(value, p).toLocaleLowerCase().includes(expected);
  if (f.operator === 'notContains')
    return !displayValue(value, p).toLocaleLowerCase().includes(expected);
  if (empty || !f.value) return false;
  const isNumber = p.type === 'number' || p.type === 'rollup';
  const a = isNumber ? Number(value) : actual,
    b = isNumber ? Number(f.value) : expected;
  if (f.operator === 'gt') return a > b;
  if (f.operator === 'gte') return a >= b;
  if (f.operator === 'lt') return a < b;
  return a <= b;
}
export function queryRows(
  rows: DatabaseRow[],
  view: DatabaseView,
  properties: Property[],
  query = '',
): DatabaseRow[] {
  const q = query.trim().toLocaleLowerCase();
  return rows
    .filter(
      (row) =>
        (!q ||
          properties.some((p) =>
            displayValue(row.values[p.id], p).toLocaleLowerCase().includes(q),
          )) &&
        (!view.filters.length ||
          (view.filterMode === 'and'
            ? view.filters.every((f) => matchesFilter(row, f, properties))
            : view.filters.some((f) => matchesFilter(row, f, properties)))),
    )
    .sort((a, b) => {
      for (const sort of view.sorts) {
        const p = properties.find((p) => p.id === sort.property);
        const av = a.values[sort.property],
          bv = b.values[sort.property];
        const ae = av === undefined || av === null || av === '',
          be = bv === undefined || bv === null || bv === '';
        if (ae !== be) return ae ? 1 : -1;
        const delta =
          typeof av === 'number' && typeof bv === 'number'
            ? av - bv
            : typeof av === 'boolean' && typeof bv === 'boolean'
              ? Number(av) - Number(bv)
              : p?.type === 'select' &&
                  p.options &&
                  typeof av === 'string' &&
                  typeof bv === 'string'
                ? p.options.indexOf(av) - p.options.indexOf(bv)
                : displayValue(av, p).localeCompare(displayValue(bv, p), 'zh-CN', {
                    numeric: true,
                  });
        if (delta) return sort.direction === 'asc' ? delta : -delta;
      }
      return 0;
    });
}
export function groupRows(rows: DatabaseRow[], property?: Property) {
  if (!property) return [{ key: '', label: '全部', rows }];
  const groups = new Map<string, DatabaseRow[]>((property.options ?? []).map((k) => [k, []]));
  for (const row of rows) {
    const value = row.values[property.id];
    const keys = Array.isArray(value)
      ? value.length
        ? value
        : ['']
      : [value === undefined || value === null ? '' : String(value)];
    for (const key of new Set(keys)) {
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }
  }
  return [...groups].map(([key, rows]) => ({
    key,
    label:
      key === ''
        ? '未设置'
        : property.type === 'checkbox'
          ? key === 'true'
            ? '已勾选'
            : '未勾选'
          : (property.labels?.[key] ?? key),
    rows,
  }));
}
export function calculate(rows: DatabaseRow[], property: string, operation: string) {
  if (operation === 'none') return '';
  const values = rows
    .map((r) => r.values[property])
    .filter(
      (v) => v !== undefined && v !== null && v !== '' && (!Array.isArray(v) || v.length > 0),
    );
  if (operation === 'count') return rows.length;
  if (operation === 'filled') return values.length;
  if (operation === 'unique')
    return new Set(values.flatMap((v) => (Array.isArray(v) ? v : [v]))).size;
  const ns = values.filter((v): v is number => typeof v === 'number');
  if (!ns.length) return operation === 'sum' ? 0 : '—';
  if (operation === 'sum') return ns.reduce((a, b) => a + b, 0);
  if (operation === 'average')
    return Number((ns.reduce((a, b) => a + b, 0) / ns.length).toFixed(2));
  if (operation === 'min') return Math.min(...ns);
  if (operation === 'max') return Math.max(...ns);
  return '';
}
export function writeCell(
  w: Workspace,
  kind: DatabaseKind,
  rowId: string,
  p: Property,
  value: CellValue,
) {
  if (p.readonly) throw new Error('此属性由关联记录自动计算');
  if (p.id.startsWith('custom:')) {
    const db = w.databases[kind];
    (db.cells[rowId] ??= {})[p.id] = value;
  } else if (kind === 'students') {
    const row = w.students.find((r) => r.id === rowId);
    if (!row) throw new Error('同学不存在');
    if (p.id === 'name' || p.id === 'number' || p.id === 'group')
      row[p.id] = String(value ?? '').trim();
  } else {
    const row = w.records.find((r) => r.id === rowId);
    if (!row) throw new Error('记录不存在');
    if (p.id === 'voided') row.voided = Boolean(value);
    else if (['studentId', 'category', 'date', 'time', 'note', 'teacher', 'room'].includes(p.id))
      Object.assign(row, { [p.id]: String(value ?? '') });
    row.updatedAt = new Date().toISOString();
  }
}
