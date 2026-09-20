import { useState } from 'react';
import {
  Search,
  Plus,
  SlidersHorizontal,
  Users,
  Clock3,
  ArrowUpRight,
  FileText,
  Undo2,
  Pencil,
  Check,
  CheckSquare,
  Square,
} from 'lucide-react';
import { useApp } from './context';
import { beijingNow, counts, matchCourse, uid, coursesOn } from './model';
import type { Student, AttendanceRecord } from './model';
import type { Session } from './Timetable';
import { PageHeading, Modal, Tag, Empty } from './ui';
export function Attendance({ session, onReports }: { session?: Session; onReports: () => void }) {
  const { w, update, busy, notify } = useApp();
  const now = beijingNow();
  const matched = matchCourse(w, now.date, now.time);
  const [context, setContext] = useState<Session>(
    session ?? { ...now, courseId: matched?.id ?? '', courseName: matched?.name ?? '' },
  );
  const [query, setQuery] = useState('');
  const [onlyRecords, setOnlyRecords] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const [manual, setManual] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [batch, setBatch] = useState(false);
  const [note, setNote] = useState('');
  const [lastIds, setLastIds] = useState<string[]>([]);
  const total = w.records.filter((r) => !r.voided).length;
  const shown = w.students.filter(
    (s) =>
      (s.name.includes(query) || s.number.includes(query)) &&
      (!onlyRecords || w.records.some((r) => !r.voided && r.studentId === s.id)),
  );
  const setCourse = (id: string) => {
    const c = w.courses.find((c) => c.id === id);
    setContext({ ...context, courseId: id, courseName: c?.name ?? '' });
  };
  async function add(ids: string[], category: string) {
    if (!context.courseName.trim()) {
      notify('请先选择课程，或填写临时课程名称。', true);
      return;
    }
    const c = w.courses.find((c) => c.id === context.courseId);
    const created = new Date().toISOString();
    const entries: AttendanceRecord[] = ids.map((studentId) => ({
      id: uid(),
      studentId,
      category,
      date: context.date,
      time: context.time,
      courseId: context.courseId,
      courseName: context.courseName.trim(),
      teacher: c?.teacher ?? '',
      room: c?.room ?? '',
      note,
      createdAt: created,
      updatedAt: created,
      voided: false,
    }));
    if (
      await update(
        (w) => w.records.push(...entries),
        `已登记 ${entries.length} 条${w.categories.find((c) => c.id === category)?.label}记录`,
      )
    ) {
      setLastIds(entries.map((r) => r.id));
      setBatch(false);
      setSelected([]);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="把每一次出勤，认真记录"
        title="考勤工作台"
        description={`${w.name} · ${w.students.length} 位同学 · ${w.term}`}
        actions={
          <>
            <button onClick={onReports}>
              <FileText size={16} />
              查看汇总
            </button>
            <button className="primary" onClick={() => setManual(true)}>
              <Plus size={16} />
              补记考勤
            </button>
          </>
        }
      />
      <div className="attendance-context">
        <div className="context-title">
          <span className="icon-tile">
            <Clock3 size={19} />
          </span>
          <div>
            <strong>本次登记</strong>
            <p>每次 +1 都会保存下方日期、时间和课程</p>
          </div>
        </div>
        <div className="context-fields">
          <label>
            日期
            <input
              aria-label="登记日期"
              type="date"
              required
              value={context.date}
              onChange={(e) => {
                if (e.target.value) setContext({ ...context, date: e.target.value });
              }}
            />
          </label>
          <label>
            北京时间
            <input
              aria-label="登记时间"
              type="time"
              required
              value={context.time}
              onChange={(e) => {
                if (e.target.value) setContext({ ...context, time: e.target.value });
              }}
            />
          </label>
          <label className="course-select-label">
            课程
            <select
              aria-label="登记课程"
              value={context.courseId}
              onChange={(e) => setCourse(e.target.value)}
            >
              <option value="">临时课程 / 手动填写</option>
              <optgroup label="所选日期的课程">
                {coursesOn(w, context.date).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.start}–{c.end} 节
                  </option>
                ))}
              </optgroup>
              <optgroup label="全部课程（调课时可选）">
                {w.courses
                  .filter((c) => !coursesOn(w, context.date).some((t) => t.id === c.id))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} · 周{['一', '二', '三', '四', '五', '六', '日'][c.day - 1]}
                    </option>
                  ))}
              </optgroup>
            </select>
          </label>
          <button
            className="small"
            onClick={() => {
              const now = beijingNow();
              const c = matchCourse(w, now.date, now.time);
              setContext({ ...now, courseId: c?.id ?? '', courseName: c?.name ?? '' });
              notify(c ? `已匹配：${c.name}` : '当前时段没有匹配课程，请手动选择。');
            }}
          >
            匹配当前课程
          </button>
        </div>
        {!context.courseId && (
          <label className="temporary-course">
            临时课程名称
            <input
              aria-label="临时课程名称"
              placeholder="当前无匹配课程，可填写调课 / 活动名称"
              value={context.courseName}
              onChange={(e) => setContext({ ...context, courseName: e.target.value })}
            />
          </label>
        )}
        <label className="session-note">
          备注
          <input
            placeholder="选填，如请假原因、调课说明…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
      </div>
      <div className="table-toolbar">
        <div className="tabs">
          <button className={!onlyRecords ? 'active' : ''} onClick={() => setOnlyRecords(false)}>
            <Users size={16} />
            全部同学<span>{w.students.length}</span>
          </button>
          <button className={onlyRecords ? 'active' : ''} onClick={() => setOnlyRecords(true)}>
            有考勤记录
          </button>
        </div>
        <div className="toolbar-right">
          <div className="search-box">
            <Search size={16} />
            <input
              aria-label="搜索同学"
              placeholder="搜索姓名、学号"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button className="small" disabled={!selected.length} onClick={() => setBatch(true)}>
            <SlidersHorizontal size={15} />
            批量登记{selected.length > 0 ? ` (${selected.length})` : ''}
          </button>
        </div>
      </div>
      {lastIds.length > 0 && (
        <div className="undo-bar">
          <Check size={15} />
          最近登记已保存
          <button
            onClick={async () => {
              if (
                await update((w) => {
                  w.records.forEach((r) => {
                    if (lastIds.includes(r.id)) {
                      r.voided = true;
                      r.updatedAt = new Date().toISOString();
                    }
                  });
                }, '已撤销最近一次登记')
              )
                setLastIds([]);
            }}
            disabled={busy}
          >
            <Undo2 size={14} />
            撤销
          </button>
        </div>
      )}
      <div className="table-container">
        <table className="student-table">
          <thead>
            <tr>
              <th className="check-cell">
                <button
                  className="checkbox-button"
                  aria-label="选择全部筛选同学"
                  onClick={() =>
                    setSelected(
                      shown.length && shown.every((s) => selected.includes(s.id))
                        ? []
                        : shown.map((s) => s.id),
                    )
                  }
                >
                  {shown.length > 0 && shown.every((s) => selected.includes(s.id)) ? (
                    <CheckSquare size={17} />
                  ) : (
                    <Square size={17} />
                  )}
                </button>
              </th>
              <th>
                姓名 <span className="header-light">Aa</span>
              </th>
              <th>学号</th>
              {w.categories.map((c) => (
                <th key={c.id}>
                  <Tag color={c.color}>{c.label}</Tag>
                </th>
              ))}
              <th>累计</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {shown.map((s, i) => {
              const cs = counts(w, s.id);
              return (
                <tr key={s.id} data-testid="student-row">
                  <td className="check-cell">
                    <input
                      type="checkbox"
                      aria-label={`选择${s.name}`}
                      checked={selected.includes(s.id)}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? [...selected, s.id]
                            : selected.filter((id) => id !== s.id),
                        )
                      }
                    />
                  </td>
                  <td>
                    <button className="student-name" onClick={() => setStudent(s)}>
                      <span className={`avatar avatar-${i % 5}`}>{s.name.slice(-2)}</span>
                      <strong>{s.name}</strong>
                    </button>
                  </td>
                  <td className="student-number">{s.number}</td>
                  {w.categories.map((c) => (
                    <td key={c.id}>
                      <div className="counter">
                        <span className={cs[c.id] ? `count-value ${c.color}` : 'zero'}>
                          {cs[c.id] || '—'}
                        </span>
                        <button
                          aria-label={`${s.name}${c.label}加一`}
                          title={`登记一次${c.label}`}
                          disabled={busy}
                          onClick={() => add([s.id], c.id)}
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </td>
                  ))}
                  <td className="total-cell">
                    {Object.values(cs).reduce((a, b) => a + b, 0) || '—'}
                  </td>
                  <td>
                    <button
                      className="icon-button"
                      aria-label={`查看${s.name}明细`}
                      onClick={() => setStudent(s)}
                    >
                      <ArrowUpRight size={15} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!shown.length && (
          <Empty
            icon={<Users size={30} />}
            title={w.students.length ? '没有找到同学' : '工作台还没有学生'}
            text={
              w.students.length ? '试试其他姓名或学号。' : '从左侧新建工作台，导入你的学生名单。'
            }
          />
        )}
      </div>
      <div className="table-footer">
        <span>
          {shown.length} 位同学 · {total} 条有效记录
        </span>
        <span>“—”表示没有异常记录，不等同于已确认出勤</span>
      </div>
      {student && <StudentDetail student={student} onClose={() => setStudent(null)} />}
      {manual && (
        <RecordEditor
          initial={{ ...context, note }}
          onClose={() => setManual(false)}
          onSave={async (record) => {
            if (await update((w) => w.records.push(record), '考勤已补记')) setManual(false);
          }}
        />
      )}
      {batch && (
        <Modal
          title="批量登记"
          subtitle={`为选中的 ${selected.length} 位同学登记相同课程、日期和备注。`}
          onClose={() => setBatch(false)}
        >
          <div className="batch-context">
            <strong>{context.courseName || '尚未选择课程'}</strong>
            <p>
              {context.date} · {context.time}
            </p>
          </div>
          <div className="category-actions">
            {w.categories.map((c) => (
              <button disabled={busy} key={c.id} onClick={() => add(selected, c.id)}>
                <Tag color={c.color}>{c.label}</Tag>
                <Plus size={14} />
              </button>
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}
function StudentDetail({ student, onClose }: { student: Student; onClose: () => void }) {
  const { w, update, busy } = useApp();
  const [editing, setEditing] = useState<AttendanceRecord>();
  const [showVoided, setShowVoided] = useState(false);
  const records = w.records
    .filter((r) => r.studentId === student.id && (showVoided || !r.voided))
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  const c = counts(w, student.id);
  return (
    <Modal
      wide
      title={`${student.name}的考勤明细`}
      subtitle={`${student.number} · ${student.group || w.name}`}
      onClose={onClose}
    >
      <div className="student-summary">
        {w.categories.map((k) => (
          <div key={k.id}>
            <Tag color={k.color}>{k.label}</Tag>
            <strong>
              {c[k.id]}
              <small>次</small>
            </strong>
          </div>
        ))}
      </div>
      <div className="detail-toolbar">
        <h3>登记记录</h3>
        <label className="check-label">
          <input
            type="checkbox"
            checked={showVoided}
            onChange={(e) => setShowVoided(e.target.checked)}
          />
          显示已撤销记录
        </label>
      </div>
      <div className="record-list">
        {records.map((r) => (
          <div className={`record-item ${r.voided ? 'voided' : ''}`} key={r.id}>
            <div className="record-date">
              <b>{r.date.slice(5).replace('-', '/')}</b>
              <small>
                {r.date.slice(0, 4)} · {r.time}
              </small>
            </div>
            <div className="record-body">
              <strong>{r.courseName}</strong>
              <p>
                {r.room || '未填写教室'}
                {r.teacher ? ` · ${r.teacher}` : ''}
              </p>
              {r.note && <p className="record-note">{r.note}</p>}
            </div>
            <Tag color={w.categories.find((c) => c.id === r.category)?.color}>
              {r.voided ? '已撤销' : w.categories.find((c) => c.id === r.category)?.label}
            </Tag>
            <button
              className="icon-button"
              aria-label="编辑记录"
              disabled={r.voided}
              onClick={() => setEditing(r)}
            >
              <Pencil size={15} />
            </button>
            <button
              className="text-button"
              disabled={busy}
              onClick={() =>
                update(
                  (w) => {
                    const record = w.records.find((x) => x.id === r.id)!;
                    record.voided = !record.voided;
                    record.updatedAt = new Date().toISOString();
                  },
                  r.voided ? '记录已恢复' : '记录已撤销',
                )
              }
            >
              {r.voided ? '恢复' : '撤销'}
            </button>
          </div>
        ))}
        {!records.length && (
          <Empty
            icon={<Check size={28} />}
            title="暂无异常考勤记录"
            text="登记的每一条考勤都会保留日期、课程和备注。"
          />
        )}
      </div>
      {editing && (
        <RecordEditor
          initial={editing}
          onClose={() => setEditing(undefined)}
          onSave={async (record) => {
            if (
              await update((w) => {
                w.records[w.records.findIndex((r) => r.id === record.id)] = record;
              }, '考勤明细已更新')
            )
              setEditing(undefined);
          }}
        />
      )}
    </Modal>
  );
}
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
          <button type="button" onClick={onClose}>
            取消
          </button>
          <button className="primary" disabled={busy || !w.students.length}>
            保存考勤
          </button>
        </div>
      </form>
    </Modal>
  );
}
