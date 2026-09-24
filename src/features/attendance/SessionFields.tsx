import { Clock3 } from 'lucide-react';
import { Button } from '../../components/ui';
import { useApp } from '../../context';
import type { Session } from '../../model';
import { beijingNow, coursesOn, matchCourse } from '../../model';
export function SessionFields({
  context,
  setContext,
  note,
  setNote,
}: {
  context: Session;
  setContext: (value: Session) => void;
  note: string;
  setNote: (value: string) => void;
}) {
  const { w, notify } = useApp();
  const setCourse = (id: string) => {
    const c = w.courses.find((c) => c.id === id);
    setContext({ ...context, courseId: id, courseName: c?.name ?? '' });
  };
  return (
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
        <Button
          className="small"
          onClick={() => {
            const now = beijingNow();
            const c = matchCourse(w, now.date, now.time);
            setContext({ ...now, courseId: c?.id ?? '', courseName: c?.name ?? '' });
            notify(c ? `已匹配：${c.name}` : '当前时段没有匹配课程，请手动选择。');
          }}
        >
          匹配当前课程
        </Button>
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
  );
}
