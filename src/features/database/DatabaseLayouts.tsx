import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  MoreHorizontal,
  Plus,
  Table2,
} from 'lucide-react';
import { useState } from 'react';
import { Button, Empty, IconButton, Tag } from '../../components/ui';
import type { DatabaseRow } from '../../database-engine';
import { displayValue } from '../../database-engine';
import { addDays, beijingNow, monday } from '../../model';

import type { ComponentProps } from 'react';
import type { DatabaseActions } from './actions';
import { CellDisplay } from './Cells';
import { DatabaseCard } from './DatabaseCard';
import { DatabaseTable } from './DatabaseTable';
import type { DatabaseModel } from './useDatabaseModel';
export function DatabaseLayouts({
  model,
  actions,
  query,
  onOpen: open,
  onSettings: setSettings,
  onNew: setNewRow,
  tableProps,
}: {
  model: DatabaseModel;
  actions: DatabaseActions;
  query: string;
  onOpen: (row: DatabaseRow) => void;
  onSettings: (s: string) => void;
  onNew: (v: boolean) => void;
  tableProps: Omit<ComponentProps<typeof DatabaseTable>, 'tableRows'>;
}) {
  const { view, rows, groups, properties, groupProperty, titleProperty, columns, kind } = model;
  const { moveCard } = actions;
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [month, setMonth] = useState(beijingNow().date.slice(0, 7) + '-01');
  const [dragTarget, setDragTarget] = useState<string>();
  return (
    <div className={`database-body layout-${view.layout}`}>
      {view.layout === 'table' &&
        (view.groupBy ? (
          groups.map((g) => (
            <section className="database-group" key={g.key}>
              <Button
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
              </Button>
              {!collapsed.includes(g.key) && <DatabaseTable {...tableProps} tableRows={g.rows} />}
            </section>
          ))
        ) : (
          <DatabaseTable {...tableProps} tableRows={rows} />
        ))}
      {view.layout === 'board' && (
        <div className="database-board">
          {groups.map((g) => (
            <section
              className={`board-column ${dragTarget === g.key ? 'drop-target' : ''}`}
              key={g.key}
              aria-label={`${g.label}分组`}
              onDragOver={(e) => {
                if (
                  groupProperty &&
                  !groupProperty.readonly &&
                  e.dataTransfer.types.includes('application/guilu-row')
                ) {
                  e.preventDefault();
                  setDragTarget(g.key);
                }
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragTarget(undefined);
              }}
              onDrop={(e) => {
                setDragTarget(undefined);
                e.preventDefault();
                void moveCard(e.dataTransfer.getData('application/guilu-row'), g.key);
              }}
            >
              <div className="board-heading">
                <Tag color={groupProperty?.color?.[g.key]}>{g.label}</Tag>
                <span>{g.rows.length}</span>
                <IconButton label="分组设置" onClick={() => setSettings('group')}>
                  <MoreHorizontal size={15} />
                </IconButton>
              </div>
              {g.rows.map((r) => (
                <DatabaseCard key={r.id} model={model} row={r} sourceGroup={g.key} onOpen={open} />
              ))}
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
              <div className="database-gallery">
                {g.rows.map((r) => (
                  <DatabaseCard key={r.id} model={model} row={r} onOpen={open} />
                ))}
              </div>
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
                <Button key={row.id} className="database-list-row" onClick={() => open(row)}>
                  <FileText size={16} />
                  <strong>{displayValue(row.values[titleProperty.id])}</strong>
                  {columns
                    .filter((p) => p.type !== 'title')
                    .map((p) => (
                      <span key={p.id} title={p.name}>
                        <CellDisplay value={row.values[p.id]} property={p} />
                      </span>
                    ))}
                </Button>
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
            <Button
              className="text-button"
              onClick={() => setMonth(beijingNow().date.slice(0, 7) + '-01')}
            >
              今天
            </Button>
            <IconButton
              label="上个月"
              onClick={() => setMonth(addDays(month, -1).slice(0, 7) + '-01')}
            >
              <ChevronLeft size={17} />
            </IconButton>
            <IconButton
              label="下个月"
              onClick={() => setMonth(addDays(month, 32).slice(0, 7) + '-01')}
            >
              <ChevronRight size={17} />
            </IconButton>
          </div>
          {!properties.some((p) => p.id === view.dateProperty && p.type === 'date') ? (
            <Empty
              icon={<CalendarDays size={28} />}
              title="选择日期属性"
              text="在视图设置的布局中选择一个日期属性。"
              action={<Button onClick={() => setSettings('layout')}>设置日期属性</Button>}
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
                        <Button className="calendar-record" key={r.id} onClick={() => open(r)}>
                          <FileText size={13} />
                          {displayValue(r.values[titleProperty.id])}
                        </Button>
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
                      <Button key={r.id} className="text-button" onClick={() => open(r)}>
                        {displayValue(r.values[titleProperty.id])}
                      </Button>
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
            <Button onClick={() => setNewRow(true)}>
              <Plus size={14} />
              新建
            </Button>
          }
        />
      )}
      {view.layout !== 'calendar' && (
        <Button className="database-add-row" onClick={() => setNewRow(true)}>
          <Plus size={16} />
          新建{kind === 'students' ? '同学' : '记录'}
        </Button>
      )}
    </div>
  );
}
