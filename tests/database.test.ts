import { describe, it, expect } from 'vitest';
import { initialData } from '../src/seed';
import { dataSchema, importAsCopies } from '../src/model';
import { makeView } from '../src/database-schema';
import {
  calculate,
  matchesFilter,
  groupRows,
  propertiesFor,
  queryRows,
  rowsFor,
  writeCell,
} from '../src/database-engine';
import { createBackup, parseBackup } from '../src/files';

const sample = () =>
  initialData([
    { id: 'a', name: '测试甲', number: '001', group: '一班' },
    { id: 'b', name: '测试乙', number: '002', group: '二班' },
    { id: 'c', name: '测试丙', number: '003', group: '一班' },
  ]);
describe('database migration and integrity', () => {
  it('migrates v1 in memory without mutating original data or attendance', () => {
    const data = sample();
    const old = JSON.parse(JSON.stringify(data));
    old.schemaVersion = 1;
    delete old.workspaces[0].databases;
    const before = JSON.stringify(old);
    const next = dataSchema.parse(old);
    expect(next.schemaVersion).toBe(3);
    expect(next.workspaces[0].students).toEqual(data.workspaces[0].students);
    expect(next.workspaces[0].courses).toEqual(data.workspaces[0].courses);
    expect(next.workspaces[0].databases.students.views).toHaveLength(3);
    expect(JSON.stringify(old)).toBe(before);
  });
  it('preserves custom properties, saved views and values through backup and copy restore', async () => {
    const data = sample(),
      w = data.workspaces[0],
      db = w.databases.students;
    db.properties.push({ id: 'custom:score', name: '评分', type: 'number', options: [] });
    db.cells.a = { 'custom:score': 0, 'custom:followup': '跟进中' };
    const v = makeView('custom-view', '需要跟进', 'board');
    v.groupBy = 'custom:followup';
    v.filters = [{ id: 'f', property: 'custom:score', operator: 'gte', value: '0' }];
    v.widths.name = 250;
    v.hidden = ['number'];
    db.views.push(v);
    db.activeViewId = v.id;
    const restored = await parseBackup(await createBackup(data));
    expect(restored).toEqual(data);
    const copies = importAsCopies(data, restored);
    expect(copies.workspaces[1].databases).toEqual(w.databases);
    copies.workspaces[1].databases.students.cells.a['custom:score'] = 99;
    expect(w.databases.students.cells.a['custom:score']).toBe(0);
  });
  it('rejects mistyped cells, orphan values and invalid active view before persistence', () => {
    const data = sample(),
      db = data.workspaces[0].databases.students;
    db.properties.push({ id: 'custom:n', name: '数字', type: 'number', options: [] });
    db.cells.a = { 'custom:n': 'wrong' };
    expect(() => dataSchema.parse(data)).toThrow('数字');
    db.cells.a = { 'custom:n': 3 };
    db.activeViewId = 'missing';
    expect(() => dataSchema.parse(data)).toThrow('视图');
    db.activeViewId = 'table';
    db.cells.unknown = {};
    expect(() => dataSchema.parse(data)).toThrow('不存在');
  });
  it('validates date and select options while retaining zero and false', () => {
    const data = sample(),
      db = data.workspaces[0].databases.students;
    db.properties.push(
      { id: 'custom:day', name: '日期', type: 'date', options: [] },
      { id: 'custom:ok', name: '完成', type: 'checkbox', options: [] },
    );
    db.cells.a = { 'custom:day': '2026-02-31' };
    expect(() => dataSchema.parse(data)).toThrow('日期');
    db.cells.a = { 'custom:ok': false };
    expect(() => dataSchema.parse(data)).not.toThrow();
    db.cells.a = { 'custom:followup': '不存在' };
    expect(() => dataSchema.parse(data)).toThrow('跟进状态');
  });
});
describe('shared database queries and relations', () => {
  it('uses numeric equality and select option order, and treats empty multi-select as empty', () => {
    const number = { id: 'n', name: '数字', type: 'number' as const };
    expect(
      matchesFilter(
        { id: 'r', values: { n: 2 } },
        { id: 'f', property: 'n', operator: 'equals', value: '2.0' },
        [number],
      ),
    ).toBe(true);
    expect(
      matchesFilter(
        { id: 'r', values: { n: null } },
        { id: 'f', property: 'n', operator: 'equals', value: '0' },
        [number],
      ),
    ).toBe(false);
    const select = { id: 's', name: '状态', type: 'select' as const, options: ['Z', 'A'] };
    const view = makeView('v', 'v');
    view.sorts = [{ property: 's', direction: 'asc' }];
    expect(
      queryRows(
        [
          { id: 'a', values: { s: 'A' } },
          { id: 'z', values: { s: 'Z' } },
        ],
        view,
        [select],
      ).map((r) => r.id),
    ).toEqual(['z', 'a']);
    expect(calculate([{ id: 'r', values: { tags: [] } }], 'tags', 'filled')).toBe(0);
  });
  it('supports AND/OR filters and numeric multi-sort with empty values last', () => {
    const w = sample().workspaces[0];
    w.databases.students.properties.push({
      id: 'custom:n',
      name: '分数',
      type: 'number',
      options: [],
    });
    w.databases.students.cells = { a: { 'custom:n': 10 }, b: { 'custom:n': 2 } };
    const ps = propertiesFor(w, 'students'),
      rs = rowsFor(w, 'students'),
      v = makeView('v', '筛选');
    v.filters = [
      { id: 'f1', property: 'group', operator: 'equals', value: '一班' },
      { id: 'f2', property: 'custom:n', operator: 'lt', value: '5' },
    ];
    expect(queryRows(rs, v, ps)).toHaveLength(0);
    v.filterMode = 'or';
    expect(queryRows(rs, v, ps)).toHaveLength(3);
    v.filters = [];
    v.sorts = [{ property: 'custom:n', direction: 'desc' }];
    expect(queryRows(rs, v, ps).map((r) => r.id)).toEqual(['a', 'b', 'c']);
    v.sorts[0].direction = 'asc';
    expect(queryRows(rs, v, ps).map((r) => r.id)).toEqual(['b', 'a', 'c']);
  });
  it('uses displayed relation names for search, not internal IDs', () => {
    const w = sample().workspaces[0];
    w.records.push({
      id: 'r',
      studentId: 'b',
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
    });
    const ps = propertiesFor(w, 'records');
    expect(queryRows(rowsFor(w, 'records'), makeView('v', 'v'), ps, '测试乙')).toHaveLength(1);
    expect(queryRows(rowsFor(w, 'records'), makeView('v', 'v'), ps, '迟到')).toHaveLength(1);
    expect(rowsFor(w, 'students').find((r) => r.id === 'b')?.values.total).toBe(1);
    writeCell(
      w,
      'records',
      'r',
      ps.find((p) => p.id === 'studentId')!,
      'a',
    );
    expect(rowsFor(w, 'students').find((r) => r.id === 'b')?.values.total).toBe(0);
    expect(rowsFor(w, 'students')[0].values.total).toBe(1);
    writeCell(
      w,
      'records',
      'r',
      ps.find((p) => p.id === 'voided')!,
      true,
    );
    expect(rowsFor(w, 'students')[0].values.total).toBe(0);
  });
  it('groups empty and multi-select values without duplicating a row in one group', () => {
    const w = sample().workspaces[0];
    const p = {
      id: 'custom:tags',
      name: '标签',
      type: 'multiSelect' as const,
      options: ['A', 'B', 'C'],
    };
    w.databases.students.properties.push(p);
    w.databases.students.cells.a = { [p.id]: ['A', 'B'] };
    const grouped = groupRows(rowsFor(w, 'students'), p);
    expect(grouped.map((g) => [g.key, g.rows.length])).toEqual([
      ['A', 1],
      ['B', 1],
      ['C', 0],
      ['', 2],
    ]);
  });
  it('calculates filtered rows and treats zero as a real number', () => {
    const rs = [
      { id: 'a', values: { n: 0 } },
      { id: 'b', values: { n: 10 } },
      { id: 'c', values: { n: null } },
    ];
    expect(calculate(rs, 'n', 'sum')).toBe(10);
    expect(calculate(rs, 'n', 'average')).toBe(5);
    expect(calculate(rs, 'n', 'filled')).toBe(2);
    expect(calculate(rs, 'n', 'min')).toBe(0);
    expect(calculate(rs, 'n', 'none')).toBe('');
  });
  it('does not change attendance history when student metadata is edited', () => {
    const w = sample().workspaces[0],
      ps = propertiesFor(w, 'students');
    const courses = structuredClone(w.courses);
    writeCell(
      w,
      'students',
      'a',
      ps.find((p) => p.id === 'number')!,
      '0007',
    );
    expect(w.students[0].number).toBe('0007');
    expect(w.courses).toEqual(courses);
    expect(() =>
      writeCell(
        w,
        'students',
        'a',
        ps.find((p) => p.id === 'total')!,
        9,
      ),
    ).toThrow('自动计算');
  });
});
