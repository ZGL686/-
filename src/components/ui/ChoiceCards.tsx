import type { ReactNode } from 'react';
import { Button } from './Button';

/** Shared single-select cards with radio semantics and roving keyboard focus. */
export function ChoiceCards<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
  render,
}: {
  label: string;
  options: readonly { id: T }[];
  value: T;
  onChange: (value: T) => void;
  className: string;
  render: (id: T) => ReactNode;
}) {
  return (
    <div className={`${className}-options`} role="radiogroup" aria-label={label}>
      {options.map(({ id }, current) => (
        <Button
          key={id}
          role="radio"
          aria-checked={value === id}
          tabIndex={value === id ? 0 : -1}
          className={`${className}-option ${value === id ? 'selected' : ''}`}
          onClick={() => onChange(id)}
          onKeyDown={(event) => {
            if (
              !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(
                event.key,
              )
            )
              return;
            event.preventDefault();
            const next =
              event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? options.length - 1
                  : (current +
                      (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1) +
                      options.length) %
                    options.length;
            onChange(options[next].id);
            event.currentTarget.parentElement
              ?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
              [next]?.focus();
          }}
        >
          {render(id)}
        </Button>
      ))}
    </div>
  );
}
