import type { Property } from '../../database-engine';
import { displayValue, writeCell } from '../../database-engine';
import type { CellValue, CustomProperty, DatabaseView } from '../../database-schema';
import { download } from '../../files';

import type { DatabaseModel } from './useDatabaseModel';
export function databaseActions(model: DatabaseModel) {
  const { kind, view, properties, rows, columns, groupProperty, update, notify } = model;
  const saveView = (next: DatabaseView) =>
    update((w) => {
      const db = w.databases[kind];
      db.views = db.views.map((v) =>
        v.id === next.id ? { ...next, ...(next.layout === 'calendar' ? { groupBy: '' } : {}) } : v,
      );
    }, '视图已保存');
  const setValue = (rowId: string, p: Property, value: CellValue) =>
    update((w) => writeCell(w, kind, rowId, p, value), '属性已保存');
  async function saveProperty(p: CustomProperty) {
    return update((w) => {
      const db = w.databases[kind];
      if (properties.some((x) => x.name === p.name && x.id !== p.id))
        throw new Error('已存在同名属性');
      const old = db.properties.find((x) => x.id === p.id);
      if (old && ['select', 'multiSelect'].includes(p.type)) {
        const used = Object.values(db.cells)
          .flatMap((row) => (Array.isArray(row[p.id]) ? (row[p.id] as string[]) : [row[p.id]]))
          .filter((v) => v !== undefined && v !== null && v !== '');
        if (used.some((v) => !p.options.includes(String(v))))
          throw new Error('不能移除已使用的选项，请先修改相关记录');
      }
      if (old) db.properties[db.properties.indexOf(old)] = p;
      else db.properties.push(p);
    }, '属性已保存');
  }
  async function deleteProperty(id: string) {
    return update((w) => {
      const db = w.databases[kind];
      db.properties = db.properties.filter((p) => p.id !== id);
      for (const row of Object.values(db.cells)) delete row[id];
      for (const v of db.views) {
        v.filters = v.filters.filter((f) => f.property !== id);
        v.sorts = v.sorts.filter((s) => s.property !== id);
        v.hidden = v.hidden.filter((x) => x !== id);
        v.order = v.order.filter((x) => x !== id);
        if (v.groupBy === id) v.groupBy = '';
        if (v.dateProperty === id) v.dateProperty = '';
        delete v.widths[id];
        delete v.calculations[id];
      }
    }, '属性已删除');
  }
  async function moveCard(raw: string, key: string) {
    if (!groupProperty || groupProperty.readonly) return;
    try {
      const moved = JSON.parse(raw);
      const row = rows.find((r) => r.id === moved.id);
      if (!row) return;
      let value: CellValue = key;
      if (groupProperty.type === 'checkbox') value = key === 'true';
      else if (groupProperty.type === 'number') value = key ? Number(key) : null;
      else if (groupProperty.type === 'multiSelect') {
        const current = row.values[groupProperty.id];
        value = key
          ? [
              ...new Set([
                ...(Array.isArray(current) ? current : []).filter((v) => v !== moved.group),
                key,
              ]),
            ]
          : [];
      }
      await setValue(row.id, groupProperty, value);
    } catch {
      notify('未能移动卡片，请重试。', true);
    }
  }
  async function exportView() {
    try {
      const csv = [
        columns.map((p) => p.name),
        ...rows.map((r) => columns.map((p) => displayValue(r.values[p.id], p))),
      ]
        .map((row) =>
          row
            .map((s) => '"' + (/^[=+@\-\t\r]/.test(s) ? "'" + s : s).replaceAll('"', '""') + '"')
            .join(','),
        )
        .join('\r\n');
      if (
        await download(
          `${kind === 'students' ? '学生' : '考勤'}-${view.name.replace(/[<>:"/\\|?*]/g, '_')}.csv`,
          '\uFEFF' + csv,
          'text/csv;charset=utf-8',
        )
      )
        notify('当前视图已导出');
    } catch (e) {
      notify(`导出失败：${String(e)}`, true);
    }
  }

  return { saveView, setValue, saveProperty, deleteProperty, moveCard, exportView };
}
export type DatabaseActions = ReturnType<typeof databaseActions>;
