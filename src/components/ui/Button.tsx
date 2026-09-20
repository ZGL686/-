import { LoaderCircle } from 'lucide-react';
import type { ComponentProps } from 'react';

export function Button({
  pending = false,
  children,
  disabled,
  ...props
}: ComponentProps<'button'> & { pending?: boolean }) {
  return (
    <button {...props} disabled={disabled || pending} aria-busy={pending || undefined}>
      {pending && <LoaderCircle className="pending-icon" size={15} aria-hidden="true" />}
      {children}
    </button>
  );
}
export function IconButton({
  label,
  className = '',
  ...props
}: ComponentProps<typeof Button> & { label: string }) {
  return (
    <Button
      type="button"
      {...props}
      className={`icon-button ${className}`}
      aria-label={label}
      data-tooltip={label}
    />
  );
}
