import { useEffect, useState } from 'react';
import {
  Save,
  Plus,
  ShieldCheck,
  Download,
  Upload,
  History,
  HardDrive,
  ArrowRight,
  FolderOpen,
} from 'lucide-react';
import { useApp } from './context';
import { newWorkspace, uid, importAsCopies, beijingNow, weekOf } from './model';
import type { Workspace, AppData, Student } from './model';
import { createBackup, parseBackup, download, readRoster } from './files';
import * as storage from './storage';
import { PageHeading, Modal, Tag } from './ui';
export function Settings() {
  const { w, update, busy } = useApp();
  const [draft, setDraft] = useState<Workspace>(structuredClone(w));
  const [label, setLabel] = useState('');
  return (
    <>
      <PageHeading
        eyebrow="让工作台适合你的学期"
        title="学期设置"
        description="开学日期、作息时间和考勤类型，都可以在这里调整。"
      />
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
              <button
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
              </button>
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
          <button className="primary" disabled={busy}>
            <Save size={16} />
            保存学期设置
          </button>
        </div>
      </form>
    </>
  );
}
export function Backups() {
  const { data, revision, change, notify, busy } = useApp();
  const [location, setLocation] = useState('正在读取…');
  const [history, setHistory] = useState<storage.Snapshot[]>([]);
  const [incoming, setIncoming] = useState<AppData | null>(null);
  const [working, setWorking] = useState(false);
  useEffect(() => {
    storage
      .location()
      .then(setLocation)
      .catch((e) => notify(String(e), true));
    storage
      .snapshots()
      .then(setHistory)
      .catch((e) => notify(String(e), true));
  }, [revision]);
  async function exportBackup() {
    setWorking(true);
    try {
      if (
        await download(
          `归录_完整备份_${beijingNow().date}_${Date.now()}.json`,
          await createBackup(data),
          'application/json',
        )
      )
        notify('完整备份已导出');
    } catch (e) {
      notify(`备份失败：${String(e)}`, true);
    } finally {
      setWorking(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="数据在本机，记录有备份"
        title="数据与备份"
        description="定期导出完整备份，让整个学期的记录妥善留存。"
      />
      <div className="backup-banner">
        <span>
          <ShieldCheck size={30} strokeWidth={1.4} />
        </span>
        <div>
          <h3>{storage.desktop ? '本地数据，独立保存' : '浏览器预览 · 本地保存'}</h3>
          <p>
            {storage.desktop
              ? '更换或更新应用文件不会清空你的工作台。每次成功保存都会保留一份历史快照。'
              : '预览数据与桌面应用独立。可用完整备份迁移到桌面版；清理浏览器数据会清除预览记录。'}
          </p>
        </div>
        <Tag color="green">已保存 · v{revision}</Tag>
      </div>
      <div className="backup-actions">
        <section>
          <span className="icon-tile">
            <Download size={22} />
          </span>
          <h3>导出完整备份</h3>
          <p>包含所有工作台、学生名单、课程、考勤记录和已撤销记录，保存为 JSON 文件。</p>
          <button className="primary" disabled={working} onClick={exportBackup}>
            <Download size={16} />
            导出备份
          </button>
        </section>
        <section>
          <span className="icon-tile">
            <Upload size={22} />
          </span>
          <h3>从备份恢复</h3>
          <p>先校验文件完整性，再恢复成独立工作台。现有数据将继续保留。</p>
          <label className="file-button">
            <Upload size={16} />
            选择备份文件
            <input
              type="file"
              accept=".json"
              aria-label="选择备份文件"
              disabled={working}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                setWorking(true);
                try {
                  if (file.size > 100 * 1024 * 1024) throw new Error('备份文件超过 100 MB。');
                  setIncoming(await parseBackup(await file.text()));
                } catch (e) {
                  notify(`备份未导入：${String(e)}`, true);
                } finally {
                  setWorking(false);
                }
              }}
            />
          </label>
        </section>
      </div>
      <section className="data-location">
        <HardDrive size={19} />
        <div>
          <h3>数据存储位置</h3>
          <code>{location}</code>
          <p>历史快照与原数据位于同一设备。请把导出的备份另外保存到可靠的位置。</p>
        </div>
      </section>
      <section className="snapshot-section">
        <div className="report-table-heading">
          <h3>
            <History size={18} />
            最近的保存快照
          </h3>
          <span>显示最近 30 次 · 完整历史保留在本机</span>
        </div>
        <div className="snapshot-list">
          {history.map((h) => (
            <div key={h.revision}>
              <span className="snapshot-version">v{h.revision}</span>
              <span>
                {new Date(h.savedAt).toLocaleString('zh-CN', {
                  timeZone: 'Asia/Shanghai',
                  hour12: false,
                })}
              </span>
              {h.revision === revision ? (
                <Tag color="green">当前版本</Tag>
              ) : (
                <button
                  className="text-button"
                  onClick={async () => {
                    try {
                      setIncoming(await storage.snapshot(h.revision));
                    } catch (e) {
                      notify(String(e), true);
                    }
                  }}
                >
                  恢复为副本
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
      {incoming && (
        <Modal
          title="恢复备份副本"
          subtitle="以下数据将作为新的工作台加入，现有工作台不会被覆盖。"
          onClose={() => setIncoming(null)}
        >
          <div className="restore-preview">
            {incoming.workspaces.map((w) => (
              <div key={w.id}>
                <strong>{w.name}</strong>
                <span>
                  {w.students.length} 位同学 · {w.records.filter((r) => !r.voided).length}{' '}
                  条有效记录
                </span>
              </div>
            ))}
          </div>
          <div className="modal-actions">
            <button onClick={() => setIncoming(null)}>取消</button>
            <button
              className="primary"
              disabled={busy}
              onClick={async () => {
                if (
                  await change((d) => {
                    Object.assign(d, importAsCopies(d, incoming));
                  }, '已恢复为独立工作台')
                )
                  setIncoming(null);
              }}
            >
              确认恢复
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
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
          <button type="button" onClick={onClose}>
            取消
          </button>
          <button className="primary" disabled={busy || reading || !students.length}>
            创建工作台
          </button>
        </div>
      </form>
    </Modal>
  );
}
