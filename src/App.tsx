import { useEffect, useState } from 'react';
import {
  CalendarDays,
  ClipboardCheck,
  ChartNoAxesCombined,
  Database,
  Settings2,
  Plus,
  ChevronDown,
  PanelLeftClose,
  BookOpen,
  Check,
  Command,
} from 'lucide-react';
import { useApp } from './context';
import { beijingNow } from './model';
import { Timetable } from './Timetable';
import type { Session } from './Timetable';
import { Attendance } from './Attendance';
import { Reports } from './Reports';
import { Settings, Backups, NewWorkspace } from './Settings';
type Page = 'schedule' | 'attendance' | 'reports' | 'backups' | 'settings';
const nav = [
  { id: 'schedule', label: '课程表', icon: CalendarDays },
  { id: 'attendance', label: '考勤工作台', icon: ClipboardCheck },
  { id: 'reports', label: '考勤汇总', icon: ChartNoAxesCombined },
  { id: 'backups', label: '数据与备份', icon: Database },
] as const;
export default function App() {
  const { w, data, busy, change } = useApp();
  const [page, setPage] = useState<Page>('schedule');
  const [now, setNow] = useState(beijingNow());
  const [newWorkspace, setNewWorkspace] = useState(false);
  const [session, setSession] = useState<Session>();
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setNow(beijingNow()), 10000);
    return () => clearInterval(t);
  }, []);
  function navigate(p: Page) {
    setPage(p);
    if (p !== 'attendance') setSession(undefined);
    document.querySelector('.main-scroll')?.scrollTo(0, 0);
  }
  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">归</span>
          <div>
            <strong>归录</strong>
            <span>班级考勤工作空间</span>
          </div>
          <button
            className="icon-button collapse-button"
            aria-label="收起侧栏"
            onClick={() => setCollapsed(!collapsed)}
          >
            <PanelLeftClose size={16} />
          </button>
        </div>
        <button className="workspace-switch" onClick={() => setNewWorkspace(true)}>
          <span className="workspace-letter">{w.name.slice(0, 1)}</span>
          <span>
            {w.name}
            <small>{w.term}</small>
          </span>
          <ChevronDown size={15} />
        </button>
        <div className="sidebar-caption">工作空间</div>
        <nav>
          {nav.map((n) => (
            <button
              className={page === n.id ? 'active' : ''}
              key={n.id}
              onClick={() => navigate(n.id)}
              title={n.label}
            >
              <n.icon size={18} />
              <span>{n.label}</span>
              {n.id === 'attendance' && <small>{w.students.length}</small>}
            </button>
          ))}
        </nav>
        <div className="sidebar-caption workspaces-caption">
          我的工作台
          <button
            className="icon-button"
            aria-label="新建工作台"
            onClick={() => setNewWorkspace(true)}
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="workspace-list">
          {data.workspaces.map((space) => (
            <button
              key={space.id}
              className={space.id === w.id ? 'selected' : ''}
              onClick={() => {
                void change((d) => {
                  d.activeWorkspaceId = space.id;
                }, '');
                setSession(undefined);
              }}
              title={space.name}
            >
              <BookOpen size={15} />
              <span>{space.name}</span>
              {space.id === w.id && <span className="workspace-dot" />}
            </button>
          ))}
          <button className="add-workspace" onClick={() => setNewWorkspace(true)}>
            <Plus size={15} />
            <span>新建工作台</span>
          </button>
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-message">
            <span className="small-sprout">✳</span>
            <p>
              记录日常，
              <br />
              让成长有迹可循。
            </p>
          </div>
          <button
            className={page === 'settings' ? 'active' : ''}
            onClick={() => navigate('settings')}
          >
            <Settings2 size={17} />
            <span>设置与偏好</span>
          </button>
          <div className="profile">
            <span>管</span>
            <div>
              <strong>班级考勤管理员</strong>
              <small>本地工作空间</small>
            </div>
            <span className="green-dot" />
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
                <PanelLeftClose size={17} />
              </button>
            )}
            <span className="breadcrumb-home">工作空间</span>
            <span className="breadcrumb-slash">/</span>
            <span>{page === 'settings' ? '学期设置' : nav.find((n) => n.id === page)?.label}</span>
          </div>
          <div>
            <span className="saved-status">
              <Check size={13} />
              {busy ? '保存中…' : '已保存到本机'}
            </span>
            <span className="topbar-divider" />
            <span className="beijing-clock">
              {now.date.replaceAll('-', '.')} · {now.time} 北京时间
            </span>
          </div>
        </header>
        <div className="main-scroll">
          <div className="page-content" key={`${page}-${w.id}`}>
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
            {page === 'reports' && <Reports />}
            {page === 'backups' && <Backups />}
            {page === 'settings' && <Settings />}
            <footer className="page-bottom">
              <span>归录 · 让每一次记录都有归处</span>
              <span>
                <Command size={12} /> 本地工作空间 · v0.1.0
              </span>
            </footer>
          </div>
        </div>
      </main>
      {newWorkspace && <NewWorkspace onClose={() => setNewWorkspace(false)} />}
    </div>
  );
}
