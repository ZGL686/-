import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';

// One delegated tooltip layer serves all IconButtons; no tooltip DOM or timers
// per table cell. It is outside scroll containers and never intercepts input.
export function TooltipProvider() {
  const id = useId();
  const [tip, setTip] = useState<{
    text: string;
    x: number;
    y: number;
    above: boolean;
    host: Element;
  }>();
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let anchor: HTMLElement | undefined;
    const hide = () => {
      clearTimeout(timer);
      if (anchor?.getAttribute('aria-describedby') === id)
        anchor.removeAttribute('aria-describedby');
      anchor = undefined;
      setTip(undefined);
    };
    const show = (event: Event) => {
      const next =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>('[data-tooltip]')
          : null;
      if (!next || next.matches(':disabled') || next === anchor) return;
      hide();
      anchor = next;
      timer = setTimeout(
        () => {
          if (!next.isConnected) return hide();
          const box = next.getBoundingClientRect();
          const above = box.bottom > window.innerHeight - 65;
          next.setAttribute('aria-describedby', id);
          setTip({
            text: next.dataset.tooltip ?? '',
            x: Math.max(100, Math.min(window.innerWidth - 100, box.left + box.width / 2)),
            y: above ? box.top - 7 : box.bottom + 7,
            above,
            host: next.closest('dialog[open]') ?? document.body,
          });
        },
        event.type === 'focusin' ? 120 : 350,
      );
    };
    const leave = (event: Event) => {
      const related = (event as MouseEvent).relatedTarget;
      if (!(related instanceof Node) || !anchor?.contains(related)) hide();
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') hide();
    };
    document.addEventListener('pointerover', show);
    document.addEventListener('focusin', show);
    document.addEventListener('pointerout', leave);
    document.addEventListener('focusout', leave);
    document.addEventListener('pointerdown', hide);
    document.addEventListener('keydown', key);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      hide();
      document.removeEventListener('pointerover', show);
      document.removeEventListener('focusin', show);
      document.removeEventListener('pointerout', leave);
      document.removeEventListener('focusout', leave);
      document.removeEventListener('pointerdown', hide);
      document.removeEventListener('keydown', key);
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, [id]);
  return tip
    ? createPortal(
        <div
          id={id}
          role="tooltip"
          className={`ui-tooltip ${tip.above ? 'above' : ''}`}
          style={{ left: tip.x, top: tip.y }}
        >
          {tip.text}
        </div>,
        tip.host,
      )
    : null;
}
