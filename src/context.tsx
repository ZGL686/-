import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { AppData, Workspace } from './model';
import { dataSchema } from './model';
import * as storage from './storage';
import { loadSeed } from './seed';

type Context = {
  data: AppData;
  w: Workspace;
  revision: number;
  busy: boolean;
  notice: { text: string; error: boolean } | null;
  notify: (text: string, error?: boolean) => void;
  change: (fn: (d: AppData) => void, message?: string) => Promise<boolean>;
  update: (fn: (w: Workspace) => void, message?: string) => Promise<boolean>;
};
const C = createContext<Context | null>(null);
export const useApp = () => useContext(C)!;
export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>();
  const [revision, setRevision] = useState(0);
  const [fatal, setFatal] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Context['notice']>(null);
  const state = useRef<{ data: AppData; revision: number } | undefined>(undefined);
  const saving = useRef(false);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      try {
        let current = await storage.load();
        if (!current) {
          const initial = await loadSeed();
          current = { data: initial, revision: await storage.save(initial, 0) };
        }
        state.current = current;
        setData(current.data);
        setRevision(current.revision);
      } catch (e) {
        setFatal(`读取数据失败，未覆盖已有数据。${String(e)}`);
      }
    })();
  }, []);
  useEffect(() => {
    if (!notice || notice.error) return;
    const t = setTimeout(() => setNotice(null), 4200);
    return () => clearTimeout(t);
  }, [notice]);
  const notify = (text: string, error = false) => setNotice({ text, error });
  async function change(fn: (d: AppData) => void, message = '已保存') {
    if (saving.current || !state.current) return false;
    saving.current = true;
    setBusy(true);
    try {
      const next = structuredClone(state.current.data);
      fn(next);
      dataSchema.parse(next);
      const rev = await storage.save(next, state.current.revision);
      state.current = { data: next, revision: rev };
      setData(next);
      setRevision(rev);
      if (message) notify(message);
      return true;
    } catch (e) {
      notify(`未保存：${e instanceof Error ? e.message : String(e)}`, true);
      return false;
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  if (fatal)
    return (
      <div className="fatal">
        <h1>数据暂时无法读取</h1>
        <p>{fatal}</p>
        <p>请保留原数据目录，检查磁盘权限与空间后重试。不要删除数据库或清理浏览器数据。</p>
        <button onClick={() => window.location.reload()}>重新读取</button>
      </div>
    );
  if (!data)
    return (
      <div className="loading">
        <span className="brand-mark">归</span>
        <p>正在打开你的工作台…</p>
      </div>
    );
  const w = data.workspaces.find((w) => w.id === data.activeWorkspaceId)!;
  return (
    <C.Provider
      value={{
        data,
        w,
        revision,
        busy,
        notice,
        notify,
        change,
        update: (fn, message) =>
          change((d) => fn(d.workspaces.find((w) => w.id === d.activeWorkspaceId)!), message),
      }}
    >
      {children}
      {notice && (
        <div className={`toast ${notice.error ? 'error' : ''}`} role="status">
          <span>{notice.text}</span>
          <button aria-label="关闭通知" onClick={() => setNotice(null)}>
            ×
          </button>
        </div>
      )}
    </C.Provider>
  );
}
