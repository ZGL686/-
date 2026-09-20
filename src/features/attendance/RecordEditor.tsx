import { useState } from 'react';
import { Button, Modal } from '../../components/ui';
import { useApp } from '../../context';
import type { AttendanceRecord } from '../../model';
import { beijingNow, uid } from '../../model';
export function RecordEditor({
  initial,
  onClose,
  onSave,
}: {
  initial: Partial<AttendanceRecord>;
  onClose: () => void;
  onSave: (r: AttendanceRecord) => Promise<void>;
}) {
  const { w, busy } = useApp();
  const now = beijingNow();
  const [r, setR] = useState<AttendanceRecord>({
    id: uid(),
    studentId: w.students[0]?.id ?? '',
    category: w.categories[0].id,
    ...now,
    courseId: '',
    courseName: '',
    room: '',
    teacher: '',
    note: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    voided: false,
    ...initial,
  });
  const field = (key: keyof AttendanceRecord, value: string) => setR({ ...r, [key]: value });
  return (
    <Modal
      title={initial.id ? '修改考勤明细' : '补记考勤'}
      subtitle="调课或补记时，可以手动调整时间与课程。"
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void onSave({ ...r, updatedAt: new Date().toISOString() });
        }}
      >
        <div className="form-grid">
          <label>
            同学
            <select
              required
              value={r.studentId}
              onChange={(e) => field('studentId', e.target.value)}
            >
              {w.students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.number}
                </option>
              ))}
            </select>
          </label>
          <label>
            考勤类型
            <select value={r.category} onChange={(e) => field('category', e.target.value)}>
              {w.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-grid">
          <label>
            日期
            <input
              required
              type="date"
              value={r.date}
              onChange={(e) => field('date', e.target.value)}
            />
          </label>
          <label>
            北京时间
            <input
              required
              type="time"
              value={r.time}
              onChange={(e) => field('time', e.target.value)}
            />
          </label>
        </div>
        <label>
          从课表选择
          <select
            value={r.courseId}
            onChange={(e) => {
              const c = w.courses.find((c) => c.id === e.target.value);
              setR({
                ...r,
                courseId: c?.id ?? '',
                courseName: c?.name ?? r.courseName,
                teacher: c?.teacher ?? '',
                room: c?.room ?? '',
              });
            }}
          >
            <option value="">手动填写</option>
            {w.courses.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name} · 周{c.day} · {c.start}–{c.end} 节
              </option>
            ))}
          </select>
        </label>
        <label>
          课程名称
          <input
            required
            maxLength={200}
            value={r.courseName}
            onChange={(e) => field('courseName', e.target.value)}
          />
        </label>
        <div className="form-grid">
          <label>
            教师
            <input value={r.teacher} onChange={(e) => field('teacher', e.target.value)} />
          </label>
          <label>
            教室
            <input value={r.room} onChange={(e) => field('room', e.target.value)} />
          </label>
        </div>
        <label>
          备注
          <textarea
            rows={3}
            maxLength={2000}
            value={r.note}
            onChange={(e) => field('note', e.target.value)}
          />
        </label>
        <div className="modal-actions">
          <Button type="button" onClick={onClose}>
            取消
          </Button>
          <Button className="primary" disabled={busy || !w.students.length}>
            保存考勤
          </Button>
        </div>
      </form>
    </Modal>
  );
}
