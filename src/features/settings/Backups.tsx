import { ArrowRight, Download, HardDrive, History, ShieldCheck, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, Modal, PageHeading, Tag } from '../../components/ui';
import { useApp } from '../../context';
import { createBackup, download, parseBackup } from '../../files';
import type { AppData } from '../../model';
import { beijingNow, importAsCopies } from '../../model';
import * as storage from '../../storage';
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
  }, [revision, notify]);
  async function exportBackup() {
    setWorking(true);
    try {
      if (
        await download(
          `Ludian_完整备份_${beijingNow().date}_${Date.now()}.json`,
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
      <PageHeading page="backups" description="定期导出完整备份，让整个学期的记录妥善留存。" />
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
          <Button className="primary" disabled={working} onClick={exportBackup}>
            <Download size={16} />
            导出备份
          </Button>
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
                <Button
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
                </Button>
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
            <Button onClick={() => setIncoming(null)}>取消</Button>
            <Button
              className="primary"
              pending={busy}
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
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
