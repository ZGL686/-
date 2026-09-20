import { FolderOpen } from 'lucide-react';
import { useState } from 'react';
import { Button, Modal, Tag } from '../../components/ui';
import { useApp } from '../../context';
import { readRoster } from '../../files';
import type { Student } from '../../model';
import { newWorkspace } from '../../model';
export function NewWorkspace({ onClose }: { onClose: () => void }) {
  const { w, change, busy, notify } = useApp();
  const [name, setName] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [filename, setFilename] = useState('');
  const [reading, setReading] = useState(false);
  const [copy, setCopy] = useState(false);
  return (
    <Modal
      title="新建考勤工作台"
      subtitle="为新的班级、课程或活动建立独立的考勤记录。"
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const created = newWorkspace(name.trim(), students);
          if (copy) {
            created.courses = structuredClone(w.courses);
            created.periods = structuredClone(w.periods);
            created.startDate = w.startDate;
            created.term = w.term;
            created.totalWeeks = w.totalWeeks;
          }
          if (
            await change((d) => {
              d.workspaces.push(created);
              d.activeWorkspaceId = created.id;
            }, '新工作台已创建')
          )
            onClose();
        }}
      >
        <label>
          工作台名称
          <input
            required
            maxLength={100}
            placeholder="例如：数字媒体技术班、摄影选修课"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="upload-zone">
          <FolderOpen size={28} strokeWidth={1.3} />
          <strong>{reading ? '正在读取名单…' : filename || '选择学生信息表'}</strong>
          <span>支持 .xlsx / .csv，需包含“姓名”和“学号”列</span>
          <input
            type="file"
            accept=".xlsx,.csv"
            aria-label="选择学生信息表"
            disabled={reading}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              setReading(true);
              try {
                const s = await readRoster(f);
                setStudents(s);
                setFilename(f.name);
                if (!name) setName(s[0].group ? `${s[0].group}班` : '新的考勤工作台');
              } catch (e) {
                notify(String(e), true);
                setStudents([]);
                setFilename('');
              } finally {
                setReading(false);
              }
            }}
          />
        </label>
        {students.length > 0 && (
          <div className="roster-preview">
            <div>
              <Tag color="green">成功读取 {students.length} 位同学</Tag>
              <small>预览前 5 位</small>
            </div>
            {students.slice(0, 5).map((s) => (
              <p key={s.id}>
                <strong>{s.name}</strong>
                <span>{s.number}</span>
                <span>{s.group}</span>
              </p>
            ))}
          </div>
        )}
        <label className="check-label">
          <input type="checkbox" checked={copy} onChange={(e) => setCopy(e.target.checked)} />
          复制当前工作台的课表与学期设置
        </label>
        <div className="modal-actions">
          <Button type="button" onClick={onClose}>
            取消
          </Button>
          <Button className="primary" disabled={busy || reading || !students.length}>
            创建工作台
          </Button>
        </div>
      </form>
    </Modal>
  );
}
