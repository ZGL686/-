import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import {
  X,
  ArrowUpRight,
  CalendarDays,
  ClipboardCheck,
  ChartNoAxesCombined,
  Database,
  Settings2,
  Users,
  Table2,
  FileText,
} from 'lucide-react';
export function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const d = ref.current!;
    d.showModal();
    const handler = (e: Event) => {
      e.preventDefault();
      closeRef.current();
    };
    d.addEventListener('cancel', handler);
    return () => {
      d.removeEventListener('cancel', handler);
      d.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? 'wide' : ''}`}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-top">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <button type="button" className="icon-button" aria-label="关闭弹窗" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Empty({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span>{icon}</span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
export function PageHeading({
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  const Icon =
    (
      {
        课程表: CalendarDays,
        考勤工作台: ClipboardCheck,
        考勤汇总: ChartNoAxesCombined,
        数据与备份: Database,
        学期设置: Settings2,
        学生数据库: Users,
        考勤记录: Table2,
      } as Record<string, typeof FileText>
    )[title] ?? FileText;
  return (
    <div className="page-heading">
      <div>
        <h1>
          <Icon className="page-title-icon" size={32} strokeWidth={1.65} />
          {title}
        </h1>
        <p>{description}</p>
      </div>
      {actions && <div className="heading-actions">{actions}</div>}
    </div>
  );
}
export function Tag({ children, color = 'gray' }: { children: ReactNode; color?: string }) {
  return <span className={`tag ${color}`}>{children}</span>;
}
export function TextLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button className="text-link" onClick={onClick}>
      {children}
      <ArrowUpRight size={14} />
    </button>
  );
}
