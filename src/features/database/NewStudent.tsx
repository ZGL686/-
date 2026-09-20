import { useState } from 'react';
import { Button, Modal } from '../../components/ui';
import { useApp } from '../../context';
import { uid } from '../../model';

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
          <Button type="button" onClick={onClose}>
            取消
          </Button>
          <Button className="primary" pending={busy}>
            添加同学
          </Button>
        </div>
      </form>
    </Modal>
  );
}
