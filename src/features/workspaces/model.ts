import type { AppData, Workspace } from '../../model';

export const activeWorkspaces = (data: AppData) => data.workspaces.filter((w) => !w.deletedAt);

function findWorkspace(data: AppData, id: string): Workspace {
  const workspace = data.workspaces.find((w) => w.id === id);
  if (!workspace) throw new Error('工作台不存在，请重新打开管理页面。');
  return workspace;
}

export function editWorkspace(data: AppData, id: string, name: string, term: string) {
  const w = findWorkspace(data, id);
  if (w.deletedAt) throw new Error('请先从回收站恢复工作台。');
  if (!name.trim() || !term.trim()) throw new Error('请填写工作台名称和学年学期。');
  w.name = name.trim();
  w.term = term.trim();
}

export function trashWorkspace(data: AppData, id: string, now = new Date().toISOString()) {
  const w = findWorkspace(data, id);
  if (w.deletedAt) throw new Error('工作台已在回收站中。');
  const remaining = activeWorkspaces(data).filter((item) => item.id !== id);
  if (!remaining.length) throw new Error('请至少保留一个工作台，可先新建再删除。');
  w.deletedAt = now;
  if (data.activeWorkspaceId === id) data.activeWorkspaceId = remaining[0].id;
}

export function restoreWorkspace(data: AppData, id: string) {
  const w = findWorkspace(data, id);
  if (!w.deletedAt) throw new Error('工作台已恢复。');
  delete w.deletedAt;
}
