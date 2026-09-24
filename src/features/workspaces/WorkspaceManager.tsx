import { Check, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button, Empty, Modal, Tag } from '../../components/ui';
import { useApp } from '../../context';
import type { Workspace } from '../../model';
import { activeWorkspaces, editWorkspace, restoreWorkspace, trashWorkspace } from './model';

export function WorkspaceManager({ onClose, onNew }: { onClose: () => void; onNew: () => void }) {
  const { data, w, change, busy } = useApp();
  const [trash, setTrash] = useState(false);
  const [editing, setEditing] = useState<Workspace>();
  const [deleting, setDeleting] = useState<Workspace>();
  const active = activeWorkspaces(data);
  const deleted = data.workspaces.filter((item) => item.deletedAt);
  return (
    <Modal
      wide
      title="管理工作台"
      subtitle="各工作台独立保存名单、课表和考勤。删除后可在回收站恢复。"
      onClose={onClose}
    >
      <div className="workspace-manager-toolbar">
        <div className="segmented" role="group" aria-label="工作台范围">
          <Button aria-pressed={!trash} onClick={() => setTrash(false)}>
            使用中 · {active.length}
          </Button>
          <Button aria-pressed={trash} onClick={() => setTrash(true)}>
            回收站 · {deleted.length}
          </Button>
        </div>
        <Button onClick={onNew}>
          <Plus size={16} />
          新建工作台
        </Button>
      </div>
      <div className="workspace-manager-list">
        {(trash ? deleted : active).map((item) => (
          <section className="workspace-manager-row" key={item.id} aria-label={item.name}>
            <div className="workspace-manager-info">
              <strong>{item.name}</strong>
              {w.id === item.id && <Tag>当前</Tag>}
              <p>{item.term}</p>
              <small>
                {item.students.length} 位同学 · {item.courses.length} 门次课程 ·{' '}
                {item.records.filter((r) => !r.voided).length} 条有效考勤
              </small>
              {item.deletedAt && (
                <small>删除于 {new Date(item.deletedAt).toLocaleString('zh-CN')}</small>
              )}
            </div>
            <div className="workspace-row-actions">
              {trash ? (
                <Button
                  disabled={busy}
                  onClick={() =>
                    change((d) => restoreWorkspace(d, item.id), '工作台已恢复，可从班级入口切换')
                  }
                >
                  <RotateCcw size={15} />
                  恢复
                </Button>
              ) : (
                <>
                  <Button
                    disabled={busy || w.id === item.id}
                    onClick={async () => {
                      if (
                        await change((d) => {
                          d.activeWorkspaceId = item.id;
                        }, '已切换工作台')
                      )
                        onClose();
                    }}
                  >
                    <Check size={15} />
                    {w.id === item.id ? '当前工作台' : '切换'}
                  </Button>
                  <Button disabled={busy} onClick={() => setEditing(item)}>
                    <Pencil size={15} />
                    编辑
                  </Button>
                  <Button
                    className="danger-text"
                    disabled={busy || active.length === 1}
                    title={
                      active.length === 1 ? '请至少保留一个工作台，可先新建再删除' : '移入回收站'
                    }
                    onClick={() => setDeleting(item)}
                  >
                    <Trash2 size={15} />
                    删除
                  </Button>
                </>
              )}
            </div>
          </section>
        ))}
      </div>
      {trash && !deleted.length && (
        <Empty
          icon={<Trash2 size={28} />}
          title="回收站是空的"
          text="删除的工作台会保留全部数据，可随时恢复。"
        />
      )}
      {!trash && active.length === 1 && (
        <p className="appearance-note">请至少保留一个工作台。如需替换，请先新建工作台。</p>
      )}
      {editing && <WorkspaceEditor workspace={editing} onClose={() => setEditing(undefined)} />}
      {deleting && (
        <Modal
          title={`删除“${deleting.name}”？`}
          subtitle="工作台将移入回收站，学生、课程和考勤完整保留。"
          onClose={() => setDeleting(undefined)}
        >
          <p>
            {deleting.students.length} 位同学 · {deleting.records.length} 条考勤（含已撤销）
          </p>
          {deleting.id === w.id && (
            <p className="appearance-note">删除当前工作台后，将自动切换到另一个使用中的工作台。</p>
          )}
          <div className="modal-actions">
            <Button disabled={busy} onClick={() => setDeleting(undefined)}>
              取消
            </Button>
            <Button
              className="danger"
              pending={busy}
              onClick={async () => {
                if (
                  await change(
                    (d) => trashWorkspace(d, deleting.id),
                    '工作台已移入回收站，可随时恢复',
                  )
                )
                  setDeleting(undefined);
              }}
            >
              移入回收站
            </Button>
          </div>
        </Modal>
      )}
    </Modal>
  );
}

function WorkspaceEditor({ workspace, onClose }: { workspace: Workspace; onClose: () => void }) {
  const { change, busy } = useApp();
  const [name, setName] = useState(workspace.name);
  const [term, setTerm] = useState(workspace.term);
  return (
    <Modal
      title="编辑工作台"
      subtitle="修改名称或学期标签不会改变历史考勤；开学日期与作息在学期设置中调整。"
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (await change((d) => editWorkspace(d, workspace.id, name, term), '工作台信息已更新'))
            onClose();
        }}
      >
        <label>
          工作台名称
          <input required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          学年学期
          <input required maxLength={100} value={term} onChange={(e) => setTerm(e.target.value)} />
        </label>
        <div className="modal-actions">
          <Button type="button" onClick={onClose}>
            取消
          </Button>
          <Button className="primary" pending={busy} disabled={!name.trim() || !term.trim()}>
            保存修改
          </Button>
        </div>
      </form>
    </Modal>
  );
}
