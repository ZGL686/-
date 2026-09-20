import { useState } from 'react';
import { Button, Modal } from '../../components/ui';
import { useApp } from '../../context';
import type { DatabaseView } from '../../database-schema';

import { layoutIcons, layoutNames } from './labels';
export function NewView({
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
              <Button
                key={id}
                type="button"
                className={layout === id ? 'active' : ''}
                onClick={() => setLayout(id as DatabaseView['layout'])}
              >
                <Icon size={25} />
                {label}
              </Button>
            );
          })}
        </div>
        <div className="modal-actions">
          <Button type="button" onClick={onClose}>
            取消
          </Button>
          <Button className="primary" pending={busy}>
            创建视图
          </Button>
        </div>
      </form>
    </Modal>
  );
}
