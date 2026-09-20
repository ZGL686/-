import { Plus, Save } from 'lucide-react';
import { useState } from 'react';
import { Button, Tag } from '../../components/ui';
import { useApp } from '../../context';
import type { Workspace } from '../../model';
import { beijingNow, uid, weekOf } from '../../model';
export function TermSettings() {
  const { w, update, busy } = useApp();
  const [draft, setDraft] = useState<Workspace>(structuredClone(w));
  const [label, setLabel] = useState('');
  return (
    <>
      <form
        className="settings-form"
        onSubmit={async (e) => {
          e.preventDefault();
          await update((current) => {
            Object.assign(current, {
              name: draft.name,
              term: draft.term,
              startDate: draft.startDate,
              totalWeeks: draft.totalWeeks,
              periods: draft.periods,
              notes: draft.notes,
              categories: draft.categories,
            });
          }, '学期设置已保存');
        }}
      >
        <section className="settings-section">
          <div>
            <h3>基本信息</h3>
            <p>修改课表设置后，已有考勤的日期与课程保持原样。</p>
          </div>
          <div className="settings-content">
            <div className="form-grid">
              <label>
                工作台名称
                <input
                  required
                  maxLength={100}
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </label>
              <label>
                学年学期
                <input
                  required
                  maxLength={100}
                  value={draft.term}
                  onChange={(e) => setDraft({ ...draft, term: e.target.value })}
                />
              </label>
              <label>
                开学日期
                <input
                  aria-label="开学日期"
                  required
                  type="date"
                  value={draft.startDate}
                  onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
                />
                <small>所选日期所在的周一为第 1 周起点。</small>
              </label>
              <label>
                学期总周数
                <input
                  required
                  type="number"
                  min={1}
                  max={30}
                  value={draft.totalWeeks}
                  onChange={(e) => setDraft({ ...draft, totalWeeks: +e.target.value })}
                />
              </label>
            </div>
            <div className="inline-note">
              根据开学日期，今天是第{' '}
              {draft.startDate ? weekOf(draft.startDate, beijingNow().date) : '—'} 周。
            </div>
          </div>
        </section>
        <section className="settings-section">
          <div>
            <h3>作息时间</h3>
            <p>
              按北京时间匹配当前课程。
              <br />第 9–10 节时间请按学校实际作息核对。
            </p>
          </div>
          <div className="period-settings">
            {draft.periods.map((p, i) => (
              <div key={i}>
                <span>第 {i + 1} 节</span>
                <input
                  aria-label={`第${i + 1}节开始时间`}
                  type="time"
                  required
                  value={p.start}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      periods: draft.periods.map((v, j) =>
                        j === i ? { ...v, start: e.target.value } : v,
                      ),
                    })
                  }
                />
                <span>至</span>
                <input
                  aria-label={`第${i + 1}节结束时间`}
                  type="time"
                  required
                  value={p.end}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      periods: draft.periods.map((v, j) =>
                        j === i ? { ...v, end: e.target.value } : v,
                      ),
                    })
                  }
                />
              </div>
            ))}
          </div>
        </section>
        <section className="settings-section">
          <div>
            <h3>考勤类型</h3>
            <p>
              保留已有类型，让历史记录始终可追溯。
              <br />
              最多支持 12 种类型。
            </p>
          </div>
          <div className="settings-content">
            <div className="category-tags">
              {draft.categories.map((c) => (
                <Tag key={c.id} color={c.color}>
                  {c.label}
                </Tag>
              ))}
            </div>
            <div className="inline-input">
              <input
                aria-label="新考勤类型"
                maxLength={30}
                placeholder="新增类型，例如：病假"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
              <Button
                type="button"
                disabled={
                  !label.trim() ||
                  draft.categories.some((c) => c.label === label.trim()) ||
                  draft.categories.length >= 12
                }
                onClick={() => {
                  setDraft({
                    ...draft,
                    categories: [
                      ...draft.categories,
                      { id: uid(), label: label.trim(), color: 'teal' },
                    ],
                  });
                  setLabel('');
                }}
              >
                <Plus size={16} />
                添加
              </Button>
            </div>
          </div>
        </section>
        <section className="settings-section">
          <div>
            <h3>学期备忘</h3>
            <p>记录实践周、未确定的课程安排等。</p>
          </div>
          <textarea
            rows={5}
            maxLength={2000}
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          />
        </section>
        <div className="settings-save">
          <Button className="primary" pending={busy}>
            <Save size={16} />
            保存学期设置
          </Button>
        </div>
      </form>
    </>
  );
}
