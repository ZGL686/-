import { useEffect, useState } from 'react';
import {
  CalendarDays,
  ClipboardCheck,
  ChartNoAxesCombined,
  Database as DatabaseIcon,
  Settings2,
  Plus,
  PanelLeftClose,
  PanelLeft,
  BookOpen,
  Check,
  Users,
  Table2,
  ChevronsUpDown,
  HardDrive,
  FileUp,
} from 'lucide-react';
import { useApp } from './context';
import { beijingNow } from './model';
import { Timetable } from './Timetable';
import type { Session } from './Timetable';
import { Attendance } from './Attendance';
import { Reports } from './Reports';
import { Settings, Backups, NewWorkspace } from './Settings';
import { Database } from './Database';
type Page = 'schedule' | 'attendance' | 'students' | 'records' | 'reports' | 'backups' | 'settings';
const nav = [
  { id: 'schedule', label: '课程表', icon: CalendarDays },
  { id: 'attendance', label: '考勤工作台', icon: ClipboardCheck },
  { id: 'students', label: '学生数据库', icon: Users },
  { id: 'records', label: '考勤记录', icon: Table2 },
  { id: 'reports', label: '考勤汇总', icon: ChartNoAxesCombined },
  { id: 'backups', label: '数据与备份', icon: DatabaseIcon },
] as const;
export default function App() {
  const { w, data, busy, change } = useApp();
  const [page, setPage] = useState<Page>('schedule');
  const [now, setNow] = useState(beijingNow());
  const [newWorkspace, setNewWorkspace] = useState(false);
  const [session, setSession] = useState<Session>();
  const [collapsed, setCollapsed] = useState(false);
  const [switcher, setSwitcher] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setNow(beijingNow()), 10000);
    return () => clearInterval(t);
  }, []);
  function navigate(p: Page) {
    setPage(p);
    if (p !== 'attendance') setSession(undefined);
    document.querySelector('.main-scroll')?.scrollTo(0, 0);
  }
  const currentNav = nav.find((n) => n.id === page);
  const PageIcon = currentNav?.icon ?? Settings2;
  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">归</span>
          <strong>归录工作空间</strong>
          <button
            className="icon-button collapse-button"
            aria-label="收起侧栏"
            onClick={() => setCollapsed(true)}
          >
            <PanelLeftClose size={17} />
          </button>
        </div>
        <button className="workspace-switch" onClick={() => setSwitcher(!switcher)}>
          <span className="workspace-letter">{w.name.slice(0, 1)}</span>
          <span>
            {w.name}
            <small>{w.term}</small>
          </span>
          <ChevronsUpDown size={15} />
        </button>
        {switcher && (
          <div className="workspace-switch-menu">
            {data.workspaces.map((s) => (
              <button
                key={s.id}
                disabled={busy}
                onClick={async () => {
                  if (
                    await change((d) => {
                      d.activeWorkspaceId = s.id;
                    }, '')
                  ) {
                    setSwitcher(false);
                    setSession(undefined);
                  }
                }}
              >
                {s.name}
                {s.id === w.id && <Check size={14} />}
              </button>
            ))}
            <button
              onClick={() => {
                setSwitcher(false);
                setNewWorkspace(true);
              }}
            >
              <Plus size={15} />
              新建工作台
            </button>
          </div>
        )}
        <div className="sidebar-caption">班级管理</div>
        <nav aria-label="工作空间页面">
          {nav.map((n) => (
            <button
              className={page === n.id ? 'active' : ''}
              key={n.id}
              onClick={() => navigate(n.id)}
              title={n.label}
            >
              <n.icon size={17} strokeWidth={1.7} />
              <span>{n.label}</span>
              {n.id === 'students' && <small>{w.students.length}</small>}
              {n.id === 'records' && <small>{w.records.filter((r) => !r.voided).length}</small>}
            </button>
          ))}
        </nav>
        <div className="sidebar-caption workspaces-caption">
          工作台
          <button
            className="icon-button"
            aria-label="新建工作台"
            onClick={() => setNewWorkspace(true)}
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="workspace-list">
          {data.workspaces.map((s) => (
            <button
              key={s.id}
              className={s.id === w.id ? 'selected' : ''}
              disabled={busy}
              onClick={() => {
                void change((d) => {
                  d.activeWorkspaceId = s.id;
                }, '');
                setSession(undefined);
              }}
              title={s.name}
            >
              <BookOpen size={15} />
              <span>{s.name}</span>
              {s.id === w.id && <Check size={13} />}
            </button>
          ))}
          <button className="add-workspace" onClick={() => setNewWorkspace(true)}>
            <Plus size={15} />
            <span>新建工作台</span>
          </button>
        </div>
        <div className="sidebar-bottom">
          <button onClick={() => setNewWorkspace(true)}>
            <FileUp size={17} />
            <span>导入学生名单</span>
          </button>
          <button
            className={page === 'settings' ? 'active' : ''}
            onClick={() => navigate('settings')}
          >
            <Settings2 size={17} />
            <span>设置与偏好</span>
          </button>
          <div className="local-status">
            <HardDrive size={14} />
            <span>本地保存</span>
            <small>v0.2.0</small>
          </div>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div>
            {collapsed && (
              <button
                className="icon-button"
                aria-label="展开侧栏"
                onClick={() => setCollapsed(false)}
              >
                <PanelLeft size={17} />
              </button>
            )}
            <BookOpen size={14} />
            <span className="breadcrumb-home">{w.name}</span>
            <span className="breadcrumb-slash">/</span>
            <PageIcon size={14} />
            <span>{page === 'settings' ? '学期设置' : currentNav?.label}</span>
          </div>
          <div>
            <span className="saved-status">
              <Check size={13} />
              {busy ? '保存中…' : '已保存'}
            </span>
            <span className="beijing-clock">
              {now.date} · {now.time}
            </span>
          </div>
        </header>
        <div className="main-scroll">
          <div className={`page-content page-${page}`} key={`${page}-${w.id}`}>
            {page === 'schedule' && (
              <Timetable
                now={now}
                onAttendance={(s) => {
                  setSession(s);
                  setPage('attendance');
                }}
                onSettings={() => navigate('settings')}
              />
            )}
            {page === 'attendance' && (
              <Attendance session={session} onReports={() => navigate('reports')} />
            )}
            {(page === 'students' || page === 'records') && <Database kind={page} />}
            {page === 'reports' && <Reports />}
            {page === 'backups' && <Backups />}
            {page === 'settings' && <Settings />}
          </div>
        </div>
      </main>
      {newWorkspace && <NewWorkspace onClose={() => setNewWorkspace(false)} />}
    </div>
  );
}
