import type { ReactNode } from 'react';
import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

const topLayer = () => [...document.querySelectorAll('dialog[open]')].at(-1) ?? document.body;
function subscribe(listener: () => void) {
  const observer = new MutationObserver(listener);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['open'],
  });
  return () => observer.disconnect();
}

/** Keep global feedback visible and accessible inside the foremost modal. */
export function TopLayerPortal({ children }: { children: ReactNode }) {
  const host = useSyncExternalStore(subscribe, topLayer);
  return createPortal(children, host);
}
