import { useState } from 'react';
import {
  ArrowDownUp,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Copy,
  Download,
  FileText,
  Filter as FilterIcon,
  GalleryHorizontalEnd,
  List,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
  Table2,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from './context';
import { addDays, beijingNow, monday, uid } from './model';
import { makeView } from './database-schema';
import type { CellValue, CustomProperty, DatabaseKind, DatabaseView } from './database-schema';
import {
  calculate,
  displayValue,
  groupRows,
  propertiesFor,
  queryRows,
  rowsFor,
  writeCell,
} from './database-engine';
import type { DatabaseRow, Property } from './database-engine';
import { PageHeading, Modal, Empty, Tag } from './ui';
import {
  DatabaseDetail,
  NewStudent,
  PropertyIcon,
  CellDisplay,
  ValueEditor,
} from './DatabaseDetail';
import {
  ViewSettings,
  PropertyEditor,
  ColumnMenu,
  layoutNames,
  calculationNames,
} from './DatabaseMenus';
import { RecordEditor } from './Attendance';
import { download } from './files';

const layoutIcons = {
  table: Table2,
  board: Columns3,
  gallery: GalleryHorizontalEnd,
  list: List,
  calendar: CalendarDays,
};
export function Database({ kind }: { kind: DatabaseKind }) {
  const { w, update, busy, notify } = useApp();
  const db = w.databases[kind],
    view = db.views.find((v) => v.id === db.activeViewId) ?? db.views[0];
  const properties = propertiesFor(w, kind);
  const [query, setQuery] = useState('');
  const [settings, setSettings] = useState<string>();
  const [propertyEditor, setPropertyEditor] = useState<CustomProperty | null | undefined>();
  const [newView, setNewView] = useState(false);
  const [viewMenu, setViewMenu] = useState(false);
  const [newRow, setNewRow] = useState(false);
  const [peek, setPeek] = useState<{ kind: DatabaseKind; id: string }>();
  const [selected, setSelected] = useState<string[]>([]);
  const [batchProperty, setBatchProperty] = useState<string>();
  const [cell, setCell] = useState<{ rowId: string; property: string }>();
  const [columnMenu, setColumnMenu] = useState<string>();
  const [columnPosition, setColumnPosition] = useState({ x: 0, y: 0 });
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [month, setMonth] = useState(beijingNow().date.slice(0, 7) + '-01');
  const rows = queryRows(rowsFor(w, kind), view, properties, query);
  const ordered = [
    ...view.order.filter((id) => properties.some((p) => p.id === id)),
    ...properties.map((p) => p.id).filter((id) => !view.order.includes(id)),
  ];
  const columns = ordered
    .filter(
      (id) => !view.hidden.includes(id) || properties.find((p) => p.id === id)?.type === 'title',
    )
    .map((id) => properties.find((p) => p.id === id)!);
  const groupProperty = properties.find((p) => p.id === view.groupBy);
  const groups = groupRows(rows, groupProperty);
  const titleProperty = properties[0];
  const saveView = (next: DatabaseView) =>
    update((w) => {
      const db = w.databases[kind];
      db.views = db.views.map((v) =>
        v.id === next.id ? { ...next, ...(next.layout === 'calendar' ? { groupBy: '' } : {}) } : v,
      );
    }, '视图已保存');
  const open = (row: DatabaseRow) => setPeek({ kind, id: row.id });
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
  function card(row: DatabaseRow, sourceGroup = '') {
    return (
      <article
        key={row.id}
        className="database-card"
        draggable={view.layout === 'board' && !!groupProperty && !groupProperty.readonly}
        onDragStart={(e) =>
          e.dataTransfer.setData(
            'application/guilu-row',
            JSON.stringify({ id: row.id, group: sourceGroup }),
          )
        }
      >
        <button className="database-card-title" onClick={() => open(row)}>
          <FileText size={16} />
          <strong>{displayValue(row.values[titleProperty.id])}</strong>
        </button>
        <div className="card-properties">
          {columns
            .filter((p) => p.type !== 'title' && p.id !== view.groupBy)
            .map((p) => (
              <div key={p.id} title={p.name}>
                <span className="card-property-name">{p.name}</span>
                <CellDisplay value={row.values[p.id]} property={p} />
              </div>
            ))}
        </div>
      </article>
    );
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
  function renderTable(tableRows: DatabaseRow[]) {
    return (
      <div className="database-table-scroll">
        <table className={`database-table ${view.wrap ? 'wrap' : ''}`}>
          <colgroup>
            <col style={{ width: 34 }} />
            {columns.map((p) => (
              <col
                key={p.id}
                style={{
                  width:
                    view.widths[p.id] ??
                    (p.type === 'title'
                      ? 210
                      : p.type === 'rollup'
                        ? 95
                        : p.id === 'number'
                          ? 170
                          : 160),
                }}
              />
            ))}
            <col style={{ width: 44 }} />
          </colgroup>
          <thead>
            <tr>
              <th className="db-check">
                <input
                  aria-label="选择当前视图全部记录"
                  type="checkbox"
                  checked={!!rows.length && rows.every((r) => selected.includes(r.id))}
                  onChange={(e) => setSelected(e.target.checked ? rows.map((r) => r.id) : [])}
                />
              </th>
              {columns.map((p) => (
                <th
                  key={p.id}
                  onDragOver={(e) => {
                    if (p.type !== 'title') e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const source = e.dataTransfer.getData('application/guilu-property');
                    if (
                      !ordered.includes(source) ||
                      source === titleProperty.id ||
                      p.type === 'title'
                    )
                      return;
                    const order = ordered.filter((id) => id !== source);
                    order.splice(order.indexOf(p.id), 0, source);
                    void saveView({ ...view, order });
                  }}
                >
                  <button
                    className="column-heading"
                    draggable={p.type !== 'title'}
                    onDragStart={(e) => e.dataTransfer.setData('application/guilu-property', p.id)}
                    onClick={(e) => {
                      const box = e.currentTarget.getBoundingClientRect();
                      setColumnPosition({ x: box.left, y: box.bottom });
                      setColumnMenu(p.id);
                    }}
                  >
                    <PropertyIcon type={p.type} />
                    {p.name}
                    {view.sorts.some((s) => s.property === p.id) && <ArrowDownUp size={12} />}
                  </button>
                </th>
              ))}
              <th>
                <button
                  className="icon-button"
                  aria-label="添加数据库属性"
                  onClick={() => setPropertyEditor(null)}
                >
                  <Plus size={16} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row) => (
              <tr
                key={row.id}
                className={selected.includes(row.id) ? 'row-selected' : ''}
                data-testid="database-row"
              >
                <td className="db-check">
                  <input
                    type="checkbox"
                    aria-label={`选择${displayValue(row.values[titleProperty.id])}`}
                    checked={selected.includes(row.id)}
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? [...selected, row.id]
                          : selected.filter((id) => id !== row.id),
                      )
                    }
                  />
                </td>
                {columns.map((p) => (
                  <td key={p.id} className={p.type === 'title' ? 'db-title-cell' : ''}>
                    {cell?.rowId === row.id && cell.property === p.id ? (
                      <ValueEditor
                        key={`${row.id}-${p.id}`}
                        property={p}
                        value={row.values[p.id]}
                        busy={busy}
                        onSave={(value) => setValue(row.id, p, value)}
                        onCancel={() => setCell(undefined)}
                      />
                    ) : p.type === 'title' ? (
                      <button className="database-row-title" onClick={() => open(row)}>
                        <FileText size={16} />
                        {displayValue(row.values[p.id])}
                        <span>打开 ↗</span>
                      </button>
                    ) : (
                      <button
                        className="cell-button"
                        aria-label={`${displayValue(row.values[titleProperty.id])}的${p.name}`}
                        onClick={() =>
                          p.readonly ? open(row) : setCell({ rowId: row.id, property: p.id })
                        }
                      >
                        <CellDisplay value={row.values[p.id]} property={p} />
                      </button>
                    )}
                  </td>
                ))}
                <td />
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td />
              {columns.map((p) => (
                <td key={p.id}>
                  <div className="column-calculation">
                    <select
                      aria-label={`${p.name}列计算`}
                      value={view.calculations[p.id] ?? 'none'}
                      onChange={(e) =>
                        void saveView({
                          ...view,
                          calculations: {
                            ...view.calculations,
                            [p.id]: e.target.value as keyof typeof calculationNames,
                          },
                        })
                      }
                    >
                      {Object.entries(calculationNames)
                        .filter(
                          ([id]) =>
                            ['none', 'count', 'filled', 'unique'].includes(id) ||
                            p.type === 'number' ||
                            p.type === 'rollup',
                        )
                        .map(([id, name]) => (
                          <option key={id} value={id}>
                            {name}
                          </option>
                        ))}
                    </select>
                    <span>{calculate(tableRows, p.id, view.calculations[p.id] ?? 'none')}</span>
                  </div>
                </td>
              ))}
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    );
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
  const activeSelected = selected.filter((id) => rows.some((r) => r.id === id));
  return (
    <>
      <PageHeading
        eyebrow=""
        title={kind === 'students' ? '学生数据库' : '考勤记录'}
        description={
          kind === 'students'
            ? `${w.name} · ${w.students.length} 位同学`
            : '每一条登记，关联同学、课程与日期'
        }
      />
      <div className="database-toolbar">
        <div className="database-views" role="tablist" aria-label="数据库视图">
          {db.views.map((v) => {
            const Icon = layoutIcons[v.layout];
            return (
              <button
                role="tab"
                aria-selected={v.id === view.id}
                className={v.id === view.id ? 'active' : ''}
                key={v.id}
                onClick={() => {
                  if (v.id === view.id) {
                    setViewMenu(!viewMenu);
                    return;
                  }
                  void update((w) => {
                    w.databases[kind].activeViewId = v.id;
                  }, '');
                  setSelected([]);
                  setCell(undefined);
                  setViewMenu(false);
                }}
              >
                <Icon size={16} />
                {v.name}
                {v.id === view.id && <ChevronDown size={13} />}
              </button>
            );
          })}
          <button className="icon-button" aria-label="添加视图" onClick={() => setNewView(true)}>
            <Plus size={18} />
          </button>
        </div>
        <div className="database-tools">
          <button
            title="筛选"
            aria-label="数据库筛选"
            className={`icon-button ${view.filters.length ? 'tool-active' : ''}`}
            onClick={() => setSettings('filter')}
          >
            <FilterIcon size={17} />
          </button>
          <button
            title="排序"
            aria-label="数据库排序"
            className={`icon-button ${view.sorts.length ? 'tool-active' : ''}`}
            onClick={() => setSettings('sort')}
          >
            <ArrowDownUp size={17} />
          </button>
          <button
            title="分组"
            aria-label="数据库分组"
            className={`icon-button ${view.groupBy ? 'tool-active' : ''}`}
            onClick={() => setSettings('group')}
          >
            <Columns3 size={17} />
          </button>
          <div className="database-search">
            <Search size={16} />
            <input
              aria-label="搜索数据库"
              placeholder="搜索"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected([]);
              }}
            />
          </div>
          <button
            title="属性与视图设置"
            aria-label="数据库属性"
            className="icon-button"
            onClick={() => setSettings('properties')}
          >
            <SlidersHorizontal size={17} />
          </button>
          <button
            title="导出当前视图 CSV"
            aria-label="导出当前视图"
            className="icon-button"
            onClick={() => void exportView()}
          >
            <Download size={17} />
          </button>
          <button className="primary new-row-button" onClick={() => setNewRow(true)}>
            新建
            <ChevronDown size={13} />
          </button>
        </div>
      </div>
      {viewMenu && (
        <div className="view-menu" role="dialog" aria-label="视图操作">
          <button
            onClick={() => {
              setSettings('layout');
              setViewMenu(false);
            }}
          >
            <SlidersHorizontal size={15} />
            编辑视图
          </button>
          <button
            disabled={busy || db.views.length >= 30}
            onClick={async () => {
              const copy = {
                ...structuredClone(view),
                id: uid(),
                name: `${view.name.slice(0, 44)} 副本`,
              };
              if (
                await update((w) => {
                  const db = w.databases[kind];
                  db.views.push(copy);
                  db.activeViewId = copy.id;
                }, '视图已复制')
              )
                setViewMenu(false);
            }}
          >
            <Copy size={15} />
            复制视图
          </button>
          <button
            disabled={busy || db.views.length <= 1}
            onClick={async () => {
              if (
                await update((w) => {
                  const db = w.databases[kind];
                  db.views = db.views.filter((v) => v.id !== view.id);
                  db.activeViewId = db.views[0].id;
                }, '已删除视图，原始数据保留')
              )
                setViewMenu(false);
            }}
          >
            <Trash2 size={15} />
            删除视图
          </button>
          <button onClick={() => setViewMenu(false)}>
            <X size={15} />
            关闭
          </button>
        </div>
      )}
      {(view.filters.length > 0 || view.sorts.length > 0 || view.groupBy) && (
        <div className="database-chips">
          {view.filters.map((f) => (
            <button key={f.id} onClick={() => setSettings('filter')}>
              <FilterIcon size={12} />
              {properties.find((p) => p.id === f.property)?.name}{' '}
              {f.operator === 'equals'
                ? '='
                : f.operator === 'gt'
                  ? '>'
                  : f.operator === 'empty'
                    ? '为空'
                    : f.operator === 'notEmpty'
                      ? '不为空'
                      : f.operator === 'contains'
                        ? '包含'
                        : '·'}{' '}
              {properties.find((p) => p.id === f.property)?.labels?.[f.value] ??
                (f.value === 'false' ? '否' : f.value === 'true' ? '是' : f.value)}
            </button>
          ))}
          {view.sorts.length > 0 && (
            <button onClick={() => setSettings('sort')}>
              <ArrowDownUp size={13} />
              {view.sorts.length} 项排序
            </button>
          )}
          {view.groupBy && (
            <button onClick={() => setSettings('group')}>
              <Columns3 size={13} />
              {groupProperty?.name}
            </button>
          )}
          <span className="muted">{rows.length} 条</span>
        </div>
      )}
      {!!activeSelected.length && (
        <div className="database-selection">
          <span>已选择 {activeSelected.length} 条</span>
          <select
            aria-label="批量编辑属性"
            value={batchProperty ?? ''}
            onChange={(e) => setBatchProperty(e.target.value || undefined)}
          >
            <option value="">编辑属性…</option>
            {properties
              .filter((p) => !p.readonly && p.type !== 'title' && p.id !== 'number')
              .map((p) => (
                <option value={p.id} key={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
          <button className="text-button" onClick={() => setSelected([])}>
            取消选择
          </button>
        </div>
      )}
      <div className={`database-body layout-${view.layout}`}>
        {view.layout === 'table' &&
          (view.groupBy
            ? groups.map((g) => (
                <section className="database-group" key={g.key}>
                  <button
                    className="group-heading"
                    onClick={() =>
                      setCollapsed(
                        collapsed.includes(g.key)
                          ? collapsed.filter((k) => k !== g.key)
                          : [...collapsed, g.key],
                      )
                    }
                  >
                    <ChevronDown size={15} className={collapsed.includes(g.key) ? 'closed' : ''} />
                    <Tag>{g.label}</Tag>
                    <span>{g.rows.length}</span>
                  </button>
                  {!collapsed.includes(g.key) && renderTable(g.rows)}
                </section>
              ))
            : renderTable(rows))}
        {view.layout === 'board' && (
          <div className="database-board">
            {groups.map((g) => (
              <section
                className="board-column"
                key={g.key}
                aria-label={`${g.label}分组`}
                onDragOver={(e) => {
                  if (groupProperty && !groupProperty.readonly) e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  void moveCard(e.dataTransfer.getData('application/guilu-row'), g.key);
                }}
              >
                <div className="board-heading">
                  <Tag color={groupProperty?.color?.[g.key]}>{g.label}</Tag>
                  <span>{g.rows.length}</span>
                  <button
                    className="icon-button"
                    title="分组设置"
                    onClick={() => setSettings('group')}
                  >
                    <MoreHorizontal size={15} />
                  </button>
                </div>
                {g.rows.map((r) => card(r, g.key))}
                {!g.rows.length && (
                  <div className="empty-column">
                    {groupProperty && !groupProperty.readonly ? '拖动卡片到这里' : '暂无记录'}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
        {view.layout === 'gallery' && (
          <>
            {groups.map((g) => (
              <section key={g.key}>
                {groupProperty && (
                  <div className="group-heading">
                    <Tag>{g.label}</Tag>
                    <span>{g.rows.length}</span>
                  </div>
                )}
                <div className="database-gallery">{g.rows.map((r) => card(r))}</div>
              </section>
            ))}
          </>
        )}
        {view.layout === 'list' && (
          <div className="database-list">
            {groups.map((g) => (
              <section key={g.key}>
                {groupProperty && (
                  <div className="group-heading">
                    <Tag>{g.label}</Tag>
                    <span>{g.rows.length}</span>
                  </div>
                )}
                {g.rows.map((row) => (
                  <button key={row.id} className="database-list-row" onClick={() => open(row)}>
                    <FileText size={16} />
                    <strong>{displayValue(row.values[titleProperty.id])}</strong>
                    {columns
                      .filter((p) => p.type !== 'title')
                      .map((p) => (
                        <span key={p.id} title={p.name}>
                          <CellDisplay value={row.values[p.id]} property={p} />
                        </span>
                      ))}
                  </button>
                ))}
              </section>
            ))}
          </div>
        )}
        {view.layout === 'calendar' && (
          <>
            <div className="database-calendar-toolbar">
              <h3>
                {month.slice(0, 4)} 年 {Number(month.slice(5, 7))} 月
              </h3>
              <button
                className="text-button"
                onClick={() => setMonth(beijingNow().date.slice(0, 7) + '-01')}
              >
                今天
              </button>
              <button
                className="icon-button"
                aria-label="上个月"
                onClick={() => setMonth(addDays(month, -1).slice(0, 7) + '-01')}
              >
                <ChevronLeft size={17} />
              </button>
              <button
                className="icon-button"
                aria-label="下个月"
                onClick={() => setMonth(addDays(month, 32).slice(0, 7) + '-01')}
              >
                <ChevronRight size={17} />
              </button>
            </div>
            {!properties.some((p) => p.id === view.dateProperty && p.type === 'date') ? (
              <Empty
                icon={<CalendarDays size={28} />}
                title="选择日期属性"
                text="在视图设置的布局中选择一个日期属性。"
                action={<button onClick={() => setSettings('layout')}>设置日期属性</button>}
              />
            ) : (
              <>
                <div className="database-calendar">
                  {['周一', '周二', '周三', '周四', '周五', '周六', '周日'].map((d) => (
                    <div className="month-weekday" key={d}>
                      {d}
                    </div>
                  ))}
                  {Array.from({ length: 42 }, (_, i) => addDays(monday(month), i)).map((date) => (
                    <div
                      className={`month-day ${date.slice(0, 7) !== month.slice(0, 7) ? 'outside' : ''}`}
                      key={date}
                    >
                      <span className={date === beijingNow().date ? 'today-date' : ''}>
                        {Number(date.slice(8))}
                      </span>
                      {rows
                        .filter((r) => r.values[view.dateProperty] === date)
                        .map((r) => (
                          <button className="calendar-record" key={r.id} onClick={() => open(r)}>
                            <FileText size={13} />
                            {displayValue(r.values[titleProperty.id])}
                          </button>
                        ))}
                    </div>
                  ))}
                </div>
                {rows.some((r) => !r.values[view.dateProperty]) && (
                  <div className="undated-records">
                    <h4>未设置日期</h4>
                    {rows
                      .filter((r) => !r.values[view.dateProperty])
                      .map((r) => (
                        <button key={r.id} className="text-button" onClick={() => open(r)}>
                          {displayValue(r.values[titleProperty.id])}
                        </button>
                      ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
        {!rows.length && view.layout !== 'calendar' && view.layout !== 'board' && (
          <Empty
            icon={<Table2 size={28} />}
            title={query || view.filters.length ? '没有符合条件的记录' : '数据库还是空的'}
            text="调整筛选条件，或新建一条记录。"
            action={
              <button onClick={() => setNewRow(true)}>
                <Plus size={14} />
                新建
              </button>
            }
          />
        )}
        {view.layout !== 'calendar' && (
          <button className="database-add-row" onClick={() => setNewRow(true)}>
            <Plus size={16} />
            新建{kind === 'students' ? '同学' : '记录'}
          </button>
        )}
      </div>
      <div className="database-footer">
        <span>
          {rows.length} 条记录 · {layoutNames[view.layout]}视图
        </span>
        <span>
          {kind === 'students'
            ? '异常累计由有效考勤记录自动汇总'
            : '已撤销记录保留，可在筛选中显示'}{' '}
          · 设置随工作台保存
        </span>
      </div>
      {columnMenu && properties.some((p) => p.id === columnMenu) && (
        <ColumnMenu
          key={columnMenu}
          property={properties.find((p) => p.id === columnMenu)!}
          view={view}
          position={columnPosition}
          onSave={saveView}
          onClose={() => setColumnMenu(undefined)}
          onEdit={() => {
            setPropertyEditor(db.properties.find((p) => p.id === columnMenu));
            setColumnMenu(undefined);
          }}
        />
      )}
      {settings && (
        <ViewSettings
          key={`${view.id}-${settings}`}
          view={view}
          properties={properties}
          tab={settings}
          busy={busy}
          onSave={saveView}
          onClose={() => setSettings(undefined)}
          onProperty={(p) => {
            setSettings(undefined);
            setPropertyEditor(p ?? null);
          }}
        />
      )}
      {propertyEditor !== undefined && (
        <PropertyEditor
          initial={propertyEditor ?? undefined}
          busy={busy}
          onClose={() => setPropertyEditor(undefined)}
          onSave={saveProperty}
          onDelete={deleteProperty}
        />
      )}
      {newView && (
        <NewView
          onClose={() => setNewView(false)}
          onSave={async (name, layout) => {
            const v = makeView(uid(), name, layout);
            if (layout === 'board')
              v.groupBy = kind === 'students' ? 'custom:followup' : 'category';
            if (kind === 'records')
              v.filters = [{ id: uid(), property: 'voided', operator: 'equals', value: 'false' }];
            if (
              await update((w) => {
                w.databases[kind].views.push(v);
                w.databases[kind].activeViewId = v.id;
              }, '视图已创建')
            )
              setNewView(false);
          }}
        />
      )}
      {newRow &&
        (kind === 'students' ? (
          <NewStudent onClose={() => setNewRow(false)} />
        ) : (
          <RecordEditor
            initial={{}}
            onClose={() => setNewRow(false)}
            onSave={async (record) => {
              if (await update((w) => w.records.push(record), '考勤已补记')) setNewRow(false);
            }}
          />
        ))}
      {peek && (
        <DatabaseDetail
          key={`${peek.kind}-${peek.id}`}
          kind={peek.kind}
          id={peek.id}
          onClose={() => setPeek(undefined)}
          onNavigate={(kind, id) => setPeek({ kind, id })}
        />
      )}
      {batchProperty && (
        <Modal
          title={`批量编辑 · ${properties.find((p) => p.id === batchProperty)?.name}`}
          subtitle={`应用到选中的 ${activeSelected.length} 条记录`}
          onClose={() => setBatchProperty(undefined)}
        >
          <ValueEditor
            property={properties.find((p) => p.id === batchProperty)!}
            value={undefined}
            busy={busy}
            onCancel={() => setBatchProperty(undefined)}
            onSave={async (value) => {
              const ok = await update((w) => {
                const p = properties.find((p) => p.id === batchProperty)!;
                for (const id of activeSelected) writeCell(w, kind, id, p, value);
              }, '批量修改已保存');
              if (ok) setSelected([]);
              return ok;
            }}
          />
        </Modal>
      )}
    </>
  );
}
function NewView({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (name: string, layout: DatabaseView['layout']) => Promise<void>;
}) {
  const { busy } = useApp();
  const [name, setName] = useState(''),
    [layout, setLayout] = useState<DatabaseView['layout']>('table');
  return (
    <Modal
      title="新建视图"
      subtitle="以不同方式查看同一个数据库，原始记录保持关联。"
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void onSave(name.trim() || layoutNames[layout], layout);
        }}
      >
        <label>
          视图名称
          <input
            autoFocus
            maxLength={50}
            placeholder="例如：本周迟到、待跟进同学"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <div className="layout-options">
          {Object.entries(layoutNames).map(([id, label]) => {
            const Icon = layoutIcons[id as DatabaseView['layout']];
            return (
              <button
                key={id}
                type="button"
                className={layout === id ? 'active' : ''}
                onClick={() => setLayout(id as DatabaseView['layout'])}
              >
                <Icon size={25} />
                {label}
              </button>
            );
          })}
        </div>
        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            取消
          </button>
          <button className="primary" disabled={busy}>
            创建视图
          </button>
        </div>
      </form>
    </Modal>
  );
}
