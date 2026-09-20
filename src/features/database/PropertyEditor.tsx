import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button, Modal } from '../../components/ui';
import type { CustomProperty } from '../../database-schema';

import { typeNames } from './labels';
export function PropertyEditor({
  initial,
  onClose,
  onSave,
  onDelete,
  busy,
}: {
  initial?: CustomProperty;
  onClose: () => void;
  onSave: (p: CustomProperty) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  busy: boolean;
}) {
  const [p, setP] = useState<CustomProperty>(
    initial ?? { id: `custom:${crypto.randomUUID()}`, name: '', type: 'text', options: [] },
  );
  const [options, setOptions] = useState(p.options.join('\n'));
  const [deleting, setDeleting] = useState(false);
  return (
    <Modal title={initial ? '编辑属性' : '添加属性'} onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            await onSave({
              ...p,
              name: p.name.trim(),
              options: [
                ...new Set(
                  options
                    .split(/[\n,，]/)
                    .map((s) => s.trim())
                    .filter(Boolean),
                ),
              ],
            })
          )
            onClose();
        }}
      >
        <label>
          属性名称
          <input
            autoFocus
            required
            maxLength={40}
            value={p.name}
            onChange={(e) => setP({ ...p, name: e.target.value })}
          />
        </label>
        <label>
          属性类型
          <select
            aria-label="属性类型"
            disabled={!!initial}
            value={p.type}
            onChange={(e) => setP({ ...p, type: e.target.value as CustomProperty['type'] })}
          >
            {Object.entries(typeNames)
              .filter(([id]) => !['title', 'relation', 'rollup'].includes(id))
              .map(([id, name]) => (
                <option value={id} key={id}>
                  {name}
                </option>
              ))}
          </select>
        </label>
        {['select', 'multiSelect'].includes(p.type) && (
          <label>
            选项（每行一个）
            <textarea
              rows={5}
              value={options}
              onChange={(e) => setOptions(e.target.value)}
              placeholder={'未跟进\n跟进中\n已完成'}
            />
            <small>已使用的选项需保留，避免丢失既有分类。</small>
          </label>
        )}
        {deleting && (
          <p className="form-error">
            删除后，此属性及所有单元格值会从当前数据中移除。历史快照仍然保留。
          </p>
        )}
        <div className="modal-actions">
          {initial && (
            <Button
              type="button"
              className="danger-text"
              disabled={busy}
              onClick={async () => {
                if (!deleting) setDeleting(true);
                else if (await onDelete(p.id)) onClose();
              }}
            >
              <Trash2 size={15} />
              {deleting ? '确认删除属性' : '删除属性'}
            </Button>
          )}
          <div className="spacer" />
          <Button type="button" onClick={onClose}>
            取消
          </Button>
          <Button className="primary" pending={busy} type="submit">
            保存属性
          </Button>
        </div>
      </form>
    </Modal>
  );
}
