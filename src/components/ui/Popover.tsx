import type { ReactNode, RefObject } from 'react';
import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export function Popover({
  anchor,
  onClose,
  label,
  children,
  className = '',
  id,
}: {
  anchor: RefObject<HTMLElement | null>;
  onClose: () => void;
  label: string;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const [position, setPosition] = useState({ left: 8, top: 8 });
  useLayoutEffect(() => {
    const trigger = anchor.current;
    const place = () => {
      const box = trigger?.getBoundingClientRect(),
        menu = ref.current;
      if (!box || !menu) return;
      const left = Math.max(8, Math.min(box.left, window.innerWidth - menu.offsetWidth - 8));
      const top = Math.max(8, Math.min(box.bottom + 6, window.innerHeight - menu.offsetHeight - 8));
      setPosition({ left, top });
    };
    place();
    ref.current?.querySelector<HTMLElement>('button:not(:disabled), input, select')?.focus();
    const outside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !ref.current?.contains(event.target) &&
        !trigger?.contains(event.target)
      )
        close.current();
    };
    const key = (event: KeyboardEvent) => {
      if (document.querySelector('dialog[open]')) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        close.current();
        trigger?.focus();
      }
      if (event.key === 'Tab') {
        // Let normal tab order continue, then close once focus leaves the menu.
        requestAnimationFrame(() => {
          if (!ref.current?.contains(document.activeElement)) close.current();
        });
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', key);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', key);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [anchor]);
  return createPortal(
    <div
      ref={ref}
      id={id}
      className={`ui-popover ${className}`}
      role="dialog"
      aria-label={label}
      style={{ position: 'fixed', ...position }}
    >
      {children}
    </div>,
    document.body,
  );
}
