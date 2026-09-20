import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconButton } from './Button';

export function Drawer({
  title,
  label,
  onClose,
  children,
}: {
  title: ReactNode;
  label: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = ref.current;
    element?.querySelector<HTMLElement>('button')?.focus();
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('dialog[open], .ui-popover')) {
        e.preventDefault();
        setClosing(true);
      }
    };
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('keydown', escape);
      if (
        previous?.isConnected &&
        (!document.activeElement ||
          document.activeElement === document.body ||
          element?.contains(document.activeElement))
      )
        previous.focus();
    };
  }, []);
  useEffect(() => {
    if (!closing) return;
    const reduce =
      document.documentElement.dataset.motion === 'reduced' ||
      matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = setTimeout(() => closeRef.current(), reduce ? 0 : 150);
    return () => clearTimeout(timer);
  }, [closing]);
  return createPortal(
    <aside
      ref={ref}
      className={`ui-drawer database-peek ${closing ? 'is-closing' : ''}`}
      role="dialog"
      aria-label={label}
    >
      <div className="peek-top">
        <span>{title}</span>
        <IconButton label="关闭详情" onClick={() => setClosing(true)}>
          <X size={19} />
        </IconButton>
      </div>
      {children}
    </aside>,
    document.body,
  );
}
