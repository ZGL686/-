import { CalendarDays, CheckSquare, Hash, Link2, ListFilter, Sigma, Type } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button, Tag } from '../../components/ui';
import type { Property } from '../../database-engine';
import { displayValue } from '../../database-engine';
import type { CellValue } from '../../database-schema';

export function PropertyIcon({ type }: { type: Property['type'] }) {
  const Icon = {
    text: Type,
    title: Type,
    number: Hash,
    rollup: Sigma,
    date: CalendarDays,
    checkbox: CheckSquare,
    select: ListFilter,
    multiSelect: ListFilter,
    relation: Link2,
  }[type];
  return <Icon size={15} strokeWidth={1.7} />;
}
export function CellDisplay({
  value,
  property,
}: {
  value: CellValue | undefined;
  property: Property;
}) {
  if (value === undefined || value === null || value === '')
    return <span className="cell-empty">空</span>;
  if (property.type === 'checkbox')
    return <span className={`checkbox-display ${value ? 'checked' : ''}`}>{value ? '✓' : ''}</span>;
  if (property.type === 'select' || property.type === 'multiSelect')
    return (
      <span className="cell-tags">
        {(Array.isArray(value) ? value : [String(value)]).map((v, i) => (
          <Tag
            key={v}
            color={
              property.color?.[v] ??
              ['gray', 'blue', 'green', 'amber', 'purple'][
                Math.max(0, property.options?.indexOf(v) ?? i) % 5
              ]
            }
          >
            {property.labels?.[v] ?? v}
          </Tag>
        ))}
      </span>
    );
  return <span>{displayValue(value, property)}</span>;
}
export function ValueEditor({
  property,
  value,
  onSave,
  onCancel,
  busy,
}: {
  property: Property;
  value: CellValue | undefined;
  onSave: (v: CellValue) => Promise<boolean>;
  onCancel: () => void;
  busy: boolean;
}) {
  const [draft, setDraft] = useState<CellValue>(
    value ?? (property.type === 'checkbox' ? false : property.type === 'multiSelect' ? [] : ''),
  );
  const [error, setError] = useState('');
  const saving = useRef(false);
  async function submit() {
    if (saving.current) return;
    let next = draft;
    if (property.type === 'number') {
      next = draft === '' ? null : Number(draft);
      if (next !== null && !Number.isFinite(next)) {
        setError('请输入有效数字');
        return;
      }
    }
    saving.current = true;
    if (await onSave(next)) onCancel();
    saving.current = false;
  }
  return (
    <form
      className="cell-editor"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onCancel();
        }
      }}
    >
      {property.type === 'multiSelect' ? (
        <div className="multi-options">
          {property.options?.map((o) => (
            <label key={o} className="check-label">
              <input
                type="checkbox"
                checked={Array.isArray(draft) && draft.includes(o)}
                onChange={(e) =>
                  setDraft(
                    e.target.checked
                      ? [...(Array.isArray(draft) ? draft : []), o]
                      : (Array.isArray(draft) ? draft : []).filter((x) => x !== o),
                  )
                }
              />
              {o}
            </label>
          ))}
        </div>
      ) : property.type === 'checkbox' ? (
        <select
          autoFocus
          aria-label={`编辑${property.name}`}
          value={String(draft)}
          onChange={(e) => setDraft(e.target.value === 'true')}
        >
          <option value="false">否</option>
          <option value="true">是</option>
        </select>
      ) : (property.type === 'select' || property.type === 'relation') && property.options ? (
        <select
          autoFocus
          aria-label={`编辑${property.name}`}
          value={String(draft)}
          onChange={(e) => setDraft(e.target.value)}
        >
          <option value="">未设置</option>
          {property.options.map((o) => (
            <option key={o} value={o}>
              {property.labels?.[o] ?? o}
            </option>
          ))}
        </select>
      ) : (
        <input
          autoFocus
          aria-label={`编辑${property.name}`}
          type={property.type === 'number' ? 'number' : property.type === 'date' ? 'date' : 'text'}
          step="any"
          value={String(draft)}
          maxLength={4000}
          onChange={(e) => setDraft(e.target.value)}
        />
      )}
      {error && <span className="form-error">{error}</span>}
      <div className="cell-editor-actions">
        <Button type="button" className="text-button" onClick={onCancel}>
          取消
        </Button>
        <Button className="primary small" pending={busy}>
          保存
        </Button>
      </div>
    </form>
  );
}
