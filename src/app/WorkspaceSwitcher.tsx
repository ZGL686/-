import { Check, ChevronDown, Plus } from 'lucide-react';
import { useRef, useState } from 'react';
import { AppLogo, Button, Popover } from '../components/ui';
import { useApp } from '../context';

export function WorkspaceSwitcher({
  onNew,
  onSwitch,
}: {
  onNew: () => void;
  onSwitch: () => void;
}) {
  const { w, data, busy, change } = useApp();
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);
  return (
    <>
      <Button
        ref={anchor}
        className="workspace-switch"
        aria-label="切换班级"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? 'workspace-menu' : undefined}
        onClick={() => setOpen(!open)}
      >
        <AppLogo size={30} />
        <span className="workspace-identity">
          <strong title={w.name}>{w.name}</strong>
          <small>{w.term}</small>
        </span>
        <ChevronDown className={open ? 'chevron-open' : ''} size={15} />
      </Button>
      {open && (
        <Popover
          anchor={anchor}
          id="workspace-menu"
          label="班级工作台"
          onClose={() => setOpen(false)}
          className="workspace-menu"
        >
          <div className="popover-caption">切换班级</div>
          {data.workspaces.map((workspace) => (
            <Button
              key={workspace.id}
              className="workspace-option"
              disabled={busy}
              aria-current={workspace.id === w.id ? 'true' : undefined}
              onClick={async () => {
                if (
                  workspace.id === w.id ||
                  (await change((d) => {
                    d.activeWorkspaceId = workspace.id;
                  }, ''))
                ) {
                  setOpen(false);
                  onSwitch();
                  anchor.current?.focus();
                }
              }}
            >
              <span>
                <strong>{workspace.name}</strong>
                <small>{workspace.term}</small>
              </span>
              {workspace.id === w.id && <Check size={15} />}
            </Button>
          ))}
          <div className="popover-divider" />
          <Button
            className="workspace-option"
            onClick={() => {
              setOpen(false);
              onNew();
            }}
          >
            <Plus size={16} />
            新建工作台
          </Button>
        </Popover>
      )}
    </>
  );
}
