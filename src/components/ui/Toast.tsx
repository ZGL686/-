import { CheckCircle2, CircleAlert, X } from 'lucide-react';
import { IconButton } from './Button';

export function Toast({
  text,
  error,
  onDismiss,
}: {
  text: string;
  error: boolean;
  onDismiss: () => void;
}) {
  const Icon = error ? CircleAlert : CheckCircle2;
  return (
    <div
      className={`toast ${error ? 'error' : ''}`}
      role="status"
      aria-live={error ? 'assertive' : 'polite'}
    >
      <Icon size={17} aria-hidden="true" />
      <span>{text}</span>
      <IconButton label="关闭通知" onClick={onDismiss}>
        <X size={15} />
      </IconButton>
    </div>
  );
}
