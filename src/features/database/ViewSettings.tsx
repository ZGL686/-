import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { Button, IconButton, Modal } from '../../components/ui';
import type { Property } from '../../database-engine';
import type { CustomProperty, DatabaseView } from '../../database-schema';

import { layoutNames, typeNames } from './labels';
const operators = {
  contains: '包含',
  notContains: '不包含',
  equals: '等于',
  notEquals: '不等于',
  gt: '大于 / 晚于',
  gte: '大于等于 / 不早于',
  lt: '小于 / 早于',
  lte: '小于等于 / 不晚于',
  empty: '为空',
  notEmpty: '不为空',
};

export function ViewSettings({
  view,
  properties,
  tab,
  onSave,
  onClose,
  onProperty,
  busy,
}: {
  view: DatabaseView;
  properties: Property[];
  tab: string;
  onSave: (v: DatabaseView) => Promise<boolean>;
  onClose: () => void;
  onProperty: (p?: CustomProperty) => void;
  busy: boolean;
}) {
  const [draft, setDraft] = useState(structuredClone(view));
  const [section, setSection] = useState(tab);
  const order = [
    ...draft.order.filter((id) => properties.some((p) => p.id === id)),
    ...properties.map((p) => p.id).filter((id) => !draft.order.includes(id)),
  ];
  const patch = (next: Partial<DatabaseView>) => setDraft({ ...draft, ...next });
  return (
    <Modal title="视图设置" subtitle={`仅应用于「${view.name}」视图`} onClose={onClose} wide>
      <div className="config-tabs">
        {[
          ['layout', '布局'],
          ['filter', '筛选'],
          ['sort', '排序'],
          ['group', '分组'],
          ['properties', '属性'],
        ].map(([id, name]) => (
          <Button
            key={id}
            className={section === id ? 'active' : ''}
            onClick={() => setSection(id)}
          >
            {name}
          </Button>
        ))}
      </div>
      <div className="view-config">
        {section === 'layout' && (
          <>
            <label>
              视图名称
              <input
                value={draft.name}
                maxLength={50}
                onChange={(e) => patch({ name: e.target.value })}
              />
            </label>
            <label>
              布局
              <select
                value={draft.layout}
                onChange={(e) =>
                  patch({
                    layout: e.target.value as DatabaseView['layout'],
                    ...(e.target.value === 'calendar' ? { groupBy: '' } : {}),
                  })
                }
              >
                {Object.entries(layoutNames).map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={draft.wrap}
                onChange={(e) => patch({ wrap: e.target.checked })}
              />
              换行显示单元格内容
            </label>
            {draft.layout === 'calendar' && (
              <label>
                日期属性
                <select
                  value={draft.dateProperty}
                  onChange={(e) => patch({ dateProperty: e.target.value })}
                >
                  <option value="">选择日期属性</option>
                  {properties
                    .filter((p) => p.type === 'date')
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </label>
            )}
            {draft.layout === 'calendar' && !properties.some((p) => p.type === 'date') && (
              <p className="muted">先添加一个日期属性，再在日历中查看。</p>
            )}
          </>
        )}
        {section === 'filter' && (
          <>
            <label className="filter-mode">
              满足
              <select
                aria-label="筛选逻辑"
                value={draft.filterMode}
                onChange={(e) => patch({ filterMode: e.target.value as 'and' | 'or' })}
              >
                <option value="and">全部条件（AND）</option>
                <option value="or">任一条件（OR）</option>
              </select>
              的记录
            </label>
            {draft.filters.map((f, i) => {
              const p = properties.find((p) => p.id === f.property);
              return (
                <div className="filter-rule" key={f.id}>
                  <select
                    aria-label={`筛选属性 ${i + 1}`}
                    value={f.property}
                    onChange={(e) =>
                      patch({
                        filters: draft.filters.map((r) =>
                          r.id === f.id ? { ...r, property: e.target.value, value: '' } : r,
                        ),
                      })
                    }
                  >
                    {properties.map((p) => (
                      <option value={p.id} key={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label={`筛选条件 ${i + 1}`}
                    value={f.operator}
                    onChange={(e) =>
                      patch({
                        filters: draft.filters.map((r) =>
                          r.id === f.id
                            ? { ...r, operator: e.target.value as typeof f.operator }
                            : r,
                        ),
                      })
                    }
                  >
                    {Object.entries(operators).map(([id, name]) => (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    ))}
                  </select>
                  {!['empty', 'notEmpty'].includes(f.operator) &&
                    (p?.type === 'checkbox' ||
                    (p?.options && ['equals', 'notEquals'].includes(f.operator)) ? (
                      <select
                        aria-label={`筛选值 ${i + 1}`}
                        value={f.value}
                        onChange={(e) =>
                          patch({
                            filters: draft.filters.map((r) =>
                              r.id === f.id ? { ...r, value: e.target.value } : r,
                            ),
                          })
                        }
                      >
                        <option value="">请选择</option>
                        {p.type === 'checkbox' ? (
                          <>
                            <option value="true">是</option>
                            <option value="false">否</option>
                          </>
                        ) : (
                          p.options?.map((o) => (
                            <option key={o} value={o}>
                              {p.labels?.[o] ?? o}
                            </option>
                          ))
                        )}
                      </select>
                    ) : (
                      <input
                        aria-label={`筛选值 ${i + 1}`}
                        type={
                          p?.type === 'date'
                            ? 'date'
                            : p?.type === 'number' || p?.type === 'rollup'
                              ? 'number'
                              : 'text'
                        }
                        value={f.value}
                        onChange={(e) =>
                          patch({
                            filters: draft.filters.map((r) =>
                              r.id === f.id ? { ...r, value: e.target.value } : r,
                            ),
                          })
                        }
                      />
                    ))}
                  <IconButton
                    label={`移除筛选 ${i + 1}`}
                    onClick={() => patch({ filters: draft.filters.filter((r) => r.id !== f.id) })}
                  >
                    <X size={16} />
                  </IconButton>
                </div>
              );
            })}
            <Button
              className="text-button"
              onClick={() =>
                patch({
                  filters: [
                    ...draft.filters,
                    {
                      id: crypto.randomUUID(),
                      property: properties[0].id,
                      operator: 'contains',
                      value: '',
                    },
                  ],
                })
              }
            >
              <Plus size={15} />
              添加筛选条件
            </Button>
            {!draft.filters.length && <p className="muted">没有筛选条件，显示所有记录。</p>}
          </>
        )}
        {section === 'sort' && (
          <>
            <p className="muted">按从上到下的顺序应用排序；空值放在最后。</p>
            {draft.sorts.map((s, i) => (
              <div className="sort-rule" key={i}>
                <select
                  aria-label={`排序属性 ${i + 1}`}
                  value={s.property}
                  onChange={(e) =>
                    patch({
                      sorts: draft.sorts.map((r, j) =>
                        i === j ? { ...r, property: e.target.value } : r,
                      ),
                    })
                  }
                >
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={`排序方向 ${i + 1}`}
                  value={s.direction}
                  onChange={(e) =>
                    patch({
                      sorts: draft.sorts.map((r, j) =>
                        i === j ? { ...r, direction: e.target.value as 'asc' | 'desc' } : r,
                      ),
                    })
                  }
                >
                  <option value="asc">升序</option>
                  <option value="desc">降序</option>
                </select>
                <IconButton
                  label={`上移排序 ${i + 1}`}
                  disabled={!i}
                  onClick={() => {
                    const sorts = [...draft.sorts];
                    [sorts[i - 1], sorts[i]] = [sorts[i], sorts[i - 1]];
                    patch({ sorts });
                  }}
                >
                  <ArrowUp size={15} />
                </IconButton>
                <IconButton
                  label={`移除排序 ${i + 1}`}
                  onClick={() => patch({ sorts: draft.sorts.filter((_, j) => j !== i) })}
                >
                  <X size={16} />
                </IconButton>
              </div>
            ))}
            <Button
              className="text-button"
              onClick={() =>
                patch({ sorts: [...draft.sorts, { property: properties[0].id, direction: 'asc' }] })
              }
            >
              <Plus size={15} />
              添加排序
            </Button>
          </>
        )}
        {section === 'group' && (
          <>
            <label>
              按属性分组
              <select
                aria-label="分组属性"
                disabled={draft.layout === 'calendar'}
                value={draft.groupBy}
                onChange={(e) => patch({ groupBy: e.target.value })}
              >
                <option value="">不分组</option>
                {properties
                  .filter((p) => p.type !== 'title')
                  .map((p) => (
                    <option value={p.id} key={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </label>
            <p className="muted">
              {draft.layout === 'calendar'
                ? '日历按日期排列，不使用属性分组。'
                : '看板可拖动卡片修改分组属性；自动汇总和课程关联属性只读。'}
            </p>
          </>
        )}
        {section === 'properties' && (
          <>
            <p className="muted">显示与顺序只影响当前视图；属性名称和类型属于整个数据库。</p>
            {order.map((id, i) => {
              const p = properties.find((p) => p.id === id)!;
              return (
                <div className="property-config" key={id}>
                  <GripVertical size={15} />
                  <span className="property-type">{typeNames[p.type]}</span>
                  <span>{p.name}</span>
                  {id.startsWith('custom:') && (
                    <Button className="text-button" onClick={() => onProperty(p as CustomProperty)}>
                      编辑
                    </Button>
                  )}
                  <IconButton
                    label={`上移${p.name}`}
                    disabled={i <= 1 || p.type === 'title'}
                    onClick={() => {
                      const next = [...order];
                      [next[i - 1], next[i]] = [next[i], next[i - 1]];
                      patch({ order: next });
                    }}
                  >
                    <ArrowUp size={14} />
                  </IconButton>
                  <IconButton
                    label={`下移${p.name}`}
                    disabled={i === order.length - 1 || p.type === 'title'}
                    onClick={() => {
                      const next = [...order];
                      [next[i + 1], next[i]] = [next[i], next[i + 1]];
                      patch({ order: next });
                    }}
                  >
                    <ArrowDown size={14} />
                  </IconButton>
                  <IconButton
                    label={`${draft.hidden.includes(id) ? '显示' : '隐藏'}${p.name}`}
                    disabled={p.type === 'title'}
                    onClick={() =>
                      patch({
                        hidden: draft.hidden.includes(id)
                          ? draft.hidden.filter((x) => x !== id)
                          : [...draft.hidden, id],
                      })
                    }
                  >
                    {draft.hidden.includes(id) ? <EyeOff size={16} /> : <Eye size={16} />}
                  </IconButton>
                </div>
              );
            })}
            <Button className="text-button" onClick={() => onProperty()}>
              <Plus size={15} />
              添加属性
            </Button>
          </>
        )}
      </div>
      <div className="modal-actions">
        <Button onClick={onClose}>取消</Button>
        <Button
          className="primary"
          disabled={busy || !draft.name.trim()}
          onClick={async () => {
            if (await onSave(draft)) onClose();
          }}
        >
          保存视图
        </Button>
      </div>
    </Modal>
  );
}
