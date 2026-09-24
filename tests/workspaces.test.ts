import { describe, expect, it } from 'vitest';
import { initialData } from '../src/seed';
import { dataSchema, importAsCopies, newWorkspace } from '../src/model';
import { createBackup, parseBackup } from '../src/files';
import {
  activeWorkspaces,
  editWorkspace,
  restoreWorkspace,
  trashWorkspace,
} from '../src/features/workspaces/model';

function sample() {
  const data = initialData([{ id: 's1', name: '虚构同学', number: 'TEST1', group: '测试班' }]);
  data.workspaces.push(newWorkspace('第二工作台'));
  return data;
}
describe('workspace lifecycle', () => {
  it('edits only the selected workspace metadata', () => {
    const data = sample();
    const before = structuredClone(data);
    editWorkspace(data, data.workspaces[1].id, ' 新班级 ', ' 新学期 ');
    expect(data.workspaces[0]).toEqual(before.workspaces[0]);
    expect(data.workspaces[1]).toEqual({ ...before.workspaces[1], name: '新班级', term: '新学期' });
    expect(() => editWorkspace(data, data.workspaces[0].id, ' ', '学期')).toThrow();
  });
  it('trashes the active workspace, switches safely, and restores all fields', () => {
    const data = sample();
    const before = structuredClone(data.workspaces[0]);
    trashWorkspace(data, before.id);
    expect(data.activeWorkspaceId).toBe(data.workspaces[1].id);
    expect(activeWorkspaces(data)).toHaveLength(1);
    expect(dataSchema.parse(data)).toEqual(data);
    expect(() => editWorkspace(data, before.id, 'new', 'new')).toThrow();
    restoreWorkspace(data, before.id);
    expect(data.workspaces[0]).toEqual(before);
  });
  it('keeps the current selection when another workspace is deleted and protects the last one', () => {
    const data = sample();
    trashWorkspace(data, data.workspaces[1].id);
    const before = structuredClone(data);
    expect(() => trashWorkspace(data, data.activeWorkspaceId)).toThrow('至少保留');
    expect(data).toEqual(before);
    expect(() => trashWorkspace(data, 'missing')).toThrow();
    expect(() => dataSchema.parse({ ...data, activeWorkspaceId: data.workspaces[1].id })).toThrow();
  });
  it('preserves recycle bin through backup and copy restoration without selecting deleted copies', async () => {
    const data = sample();
    data.workspaces[1].name = '测'.repeat(100);
    trashWorkspace(data, data.workspaces[0].id);
    const incoming = await parseBackup(await createBackup(data));
    const restored = importAsCopies(data, incoming);
    expect(restored.workspaces[2].deletedAt).toBe(data.workspaces[0].deletedAt);
    expect(restored.activeWorkspaceId).toBe(restored.workspaces[3].id);
    expect(restored.workspaces[3].name).toHaveLength(100);
    expect(restored.workspaces.slice(0, 2)).toEqual(data.workspaces);
  });
  it.each([1, 2])('migrates schema %s in memory without mutating the source', (schemaVersion) => {
    const original = { ...sample(), schemaVersion };
    const before = structuredClone(original);
    expect(dataSchema.parse(original).schemaVersion).toBe(3);
    expect(original).toEqual(before);
  });
});
