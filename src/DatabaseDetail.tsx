import { useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  CalendarDays,
  CheckSquare,
  FileText,
  Hash,
  Link2,
  ListFilter,
  Sigma,
  Type,
  X,
  Plus,
} from 'lucide-react';
import type { Property } from './database-engine';
import { displayValue, propertiesFor, rowsFor, writeCell } from './database-engine';
import type { CellValue, DatabaseKind } from './database-schema';
import { useApp } from './context';
import { Tag, Empty, Modal } from './ui';
import { RecordEditor } from './Attendance';
import type { AttendanceRecord } from './model';
import { uid } from './model';

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
        <button type="button" className="text-button" onClick={onCancel}>
          取消
        </button>
        <button className="primary small" disabled={busy}>
          保存
        </button>
      </div>
    </form>
  );
}

export function DatabaseDetail({
  kind,
  id,
  onClose,
  onNavigate,
}: {
  kind: DatabaseKind;
  id: string;
  onClose: () => void;
  onNavigate: (kind: DatabaseKind, id: string) => void;
}) {
  const { w, update, busy } = useApp();
  const [editing, setEditing] = useState<string>();
  const [recordEditor, setRecordEditor] = useState<Partial<AttendanceRecord>>();
  const [includeVoided, setIncludeVoided] = useState(false);
  const close = useRef<HTMLButtonElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    close.current?.focus();
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('dialog[open]')) closeRef.current();
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, []);
  const row = rowsFor(w, kind).find((r) => r.id === id);
  if (!row) return null;
  const ps = propertiesFor(w, kind);
  const title = displayValue(row.values[ps[0].id]);
  const record = w.records.find((r) => r.id === id);
  const related = w.records
    .filter((r) => r.studentId === id && (includeVoided || !r.voided))
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  return (
    <aside className="database-peek" role="dialog" aria-label={`${title}详情`}>
      <div className="peek-top">
        <span>
          <FileText size={15} />
          {kind === 'students' ? '学生数据库' : '考勤记录'}
          <span className="breadcrumb-slash">/</span>
          {title}
        </span>
        <button ref={close} className="icon-button" aria-label="关闭详情" onClick={onClose}>
          <X size={19} />
        </button>
      </div>
      <div className="peek-content">
        <FileText size={36} strokeWidth={1.3} className="peek-icon" />
        <h2>{title}</h2>
        <div className="peek-properties">
          {ps
            .filter((p) => p.id !== 'title')
            .map((p) => (
              <div className="peek-property" key={p.id}>
                <span>
                  <PropertyIcon type={p.type} />
                  {p.name}
                </span>
                {editing === p.id ? (
                  <ValueEditor
                    key={`${id}-${p.id}`}
                    property={p}
                    value={row.values[p.id]}
                    busy={busy}
                    onCancel={() => setEditing(undefined)}
                    onSave={(value) =>
                      update((w) => writeCell(w, kind, id, p, value), '属性已保存')
                    }
                  />
                ) : (
                  <div className="peek-value">
                    {p.id === 'studentId' ? (
                      <button
                        className="relation-link"
                        onClick={() => onNavigate('students', String(row.values.studentId))}
                      >
                        <Link2 size={14} />
                        {displayValue(row.values.studentId, p)}
                        <ArrowUpRight size={13} />
                      </button>
                    ) : (
                      <button
                        className="cell-button"
                        aria-label={`修改${p.name}`}
                        disabled={p.readonly}
                        title={p.readonly ? '由关联记录自动生成' : ''}
                        onClick={() => setEditing(p.id)}
                      >
                        <CellDisplay value={row.values[p.id]} property={p} />
                      </button>
                    )}
                    {p.id === 'studentId' && (
                      <button className="text-button" onClick={() => setEditing(p.id)}>
                        更改
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
        </div>
        {kind === 'students' ? (
          <div className="peek-related">
            <div className="peek-section-title">
              <h3>
                <Link2 size={16} />
                关联考勤 <span>{related.length}</span>
              </h3>
              <button className="text-button" onClick={() => setRecordEditor({ studentId: id })}>
                <Plus size={14} />
                补记
              </button>
            </div>
            <label className="check-label">
              <input
                type="checkbox"
                checked={includeVoided}
                onChange={(e) => setIncludeVoided(e.target.checked)}
              />
              包含已撤销
            </label>
            {related.map((r) => (
              <button
                key={r.id}
                className={`related-record ${r.voided ? 'voided' : ''}`}
                onClick={() => onNavigate('records', r.id)}
              >
                <FileText size={16} />
                <span>
                  {r.courseName}
                  <small>
                    {r.date} · {r.time}
                  </small>
                </span>
                <Tag color={w.categories.find((c) => c.id === r.category)?.color}>
                  {r.voided ? '已撤销' : w.categories.find((c) => c.id === r.category)?.label}
                </Tag>
                <ArrowUpRight size={14} />
              </button>
            ))}
            {!related.length && (
              <Empty
                icon={<Link2 size={22} />}
                title="还没有关联记录"
                text="从考勤工作台登记后，记录与汇总会出现在这里。"
              />
            )}
          </div>
        ) : (
          <div className="peek-related">
            <button onClick={() => setRecordEditor(record)}>编辑完整记录 / 调整课程</button>
            <p className="muted peek-hint">课程保存登记时的快照。调整课表不会改写历史记录。</p>
            <small className="muted">
              更新于{' '}
              {record?.updatedAt
                ? new Date(record.updatedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
                : '—'}
            </small>
          </div>
        )}
      </div>
      {recordEditor && (
        <RecordEditor
          initial={recordEditor}
          onClose={() => setRecordEditor(undefined)}
          onSave={async (r) => {
            if (
              await update((w) => {
                const i = w.records.findIndex((x) => x.id === r.id);
                if (i < 0) w.records.push(r);
                else w.records[i] = r;
              }, '考勤已保存')
            )
              setRecordEditor(undefined);
          }}
        />
      )}
    </aside>
  );
}
export function NewStudent({ onClose }: { onClose: () => void }) {
  const { w, update, busy } = useApp();
  const [name, setName] = useState(''),
    [number, setNumber] = useState(''),
    [group, setGroup] = useState(w.name);
  return (
    <Modal title="新建同学" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            await update((w) => {
              if (w.students.some((s) => s.number === number.trim()))
                throw new Error('该学号已存在');
              w.students.push({
                id: uid(),
                name: name.trim(),
                number: number.trim(),
                group: group.trim(),
              });
            }, '同学已添加')
          )
            onClose();
        }}
      >
        <label>
          姓名
          <input
            autoFocus
            required
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          学号
          <input
            required
            maxLength={100}
            value={number}
            onChange={(e) => setNumber(e.target.value)}
          />
        </label>
        <label>
          班级
          <input value={group} onChange={(e) => setGroup(e.target.value)} />
        </label>
        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            取消
          </button>
          <button className="primary" disabled={busy}>
            添加同学
          </button>
        </div>
      </form>
    </Modal>
  );
}
