import { ArrowUpRight, FileText, Link2, Plus } from 'lucide-react';
import { useState } from 'react';
import { Button, Drawer, Empty, Tag } from '../../components/ui';
import { useApp } from '../../context';
import { displayValue, propertiesFor, rowsFor, writeCell } from '../../database-engine';
import type { DatabaseKind } from '../../database-schema';
import type { AttendanceRecord } from '../../model';
import { RecordEditor } from '../attendance/RecordEditor';

import { CellDisplay, PropertyIcon, ValueEditor } from './Cells';
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
  const row = rowsFor(w, kind).find((r) => r.id === id);
  if (!row) return null;
  const ps = propertiesFor(w, kind);
  const title = displayValue(row.values[ps[0].id]);
  const record = w.records.find((r) => r.id === id);
  const related = w.records
    .filter((r) => r.studentId === id && (includeVoided || !r.voided))
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  return (
    <Drawer
      label={`${title}详情`}
      onClose={onClose}
      title={
        <>
          <FileText size={15} />
          {kind === 'students' ? '学生数据库' : '考勤记录'}
          <span className="breadcrumb-slash">/</span>
          {title}
        </>
      }
    >
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
                      <Button
                        className="relation-link"
                        onClick={() => onNavigate('students', String(row.values.studentId))}
                      >
                        <Link2 size={14} />
                        {displayValue(row.values.studentId, p)}
                        <ArrowUpRight size={13} />
                      </Button>
                    ) : (
                      <Button
                        className="cell-button"
                        aria-label={`修改${p.name}`}
                        disabled={p.readonly}
                        title={p.readonly ? '由关联记录自动生成' : ''}
                        onClick={() => setEditing(p.id)}
                      >
                        <CellDisplay value={row.values[p.id]} property={p} />
                      </Button>
                    )}
                    {p.id === 'studentId' && (
                      <Button className="text-button" onClick={() => setEditing(p.id)}>
                        更改
                      </Button>
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
              <Button className="text-button" onClick={() => setRecordEditor({ studentId: id })}>
                <Plus size={14} />
                补记
              </Button>
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
              <Button
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
              </Button>
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
            <Button onClick={() => setRecordEditor(record)}>编辑完整记录 / 调整课程</Button>
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
    </Drawer>
  );
}
