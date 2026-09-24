import { useEffect, useState } from 'react';
import { AppShell } from './app/AppShell';
import type { PageId } from './app/navigation';
import { WorkspaceManager } from './features/workspaces/WorkspaceManager';
import { Attendance } from './Attendance';
import { ErrorBoundary } from './components/ui';
import { useApp } from './context';
import { Database } from './features/database/DatabasePage';
import { Backups, NewWorkspace, Settings } from './features/settings';
import type { Session } from './model';
import { beijingNow } from './model';
import { Reports } from './Reports';
import { Timetable } from './Timetable';

export default function App() {
  const { w } = useApp();
  const [page, setPage] = useState<PageId>('schedule');
  const [now, setNow] = useState(beijingNow());
  const [manageWorkspaces, setManageWorkspaces] = useState(false);
  const [newWorkspace, setNewWorkspace] = useState(false);
  const [session, setSession] = useState<Session>();
  useEffect(() => {
    const timer = setInterval(() => setNow(beijingNow()), 10000);
    return () => clearInterval(timer);
  }, []);
  function navigate(next: PageId) {
    setPage(next);
    if (next !== 'attendance') setSession(undefined);
    document.querySelector('.main-scroll')?.scrollTo(0, 0);
  }
  return (
    <>
      <AppShell
        page={page}
        navigate={navigate}
        now={now}
        onNew={() => {
          setSession(undefined);
          setNewWorkspace(true);
        }}
        onManage={() => {
          setSession(undefined);
          setManageWorkspaces(true);
        }}
        onSwitch={() => setSession(undefined)}
      >
        <div className={`page-content page-${page}`} key={`${page}-${w.id}`}>
          <ErrorBoundary page onHome={() => navigate('schedule')}>
            {page === 'schedule' && (
              <Timetable
                now={now}
                onAttendance={(next) => {
                  setSession(next);
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
          </ErrorBoundary>
        </div>
      </AppShell>
      {manageWorkspaces && (
        <WorkspaceManager
          onClose={() => setManageWorkspaces(false)}
          onNew={() => {
            setManageWorkspaces(false);
            setNewWorkspace(true);
          }}
        />
      )}
      {newWorkspace && <NewWorkspace onClose={() => setNewWorkspace(false)} />}
    </>
  );
}
