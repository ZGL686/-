import { ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './Button';
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
export function Tag({ children, color = 'gray' }: { children: ReactNode; color?: string }) {
  return <span className={`tag ${color}`}>{children}</span>;
}
export function TextLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <Button className="text-link" onClick={onClick}>
      {children}
      <ArrowUpRight size={14} />
    </Button>
  );
}
