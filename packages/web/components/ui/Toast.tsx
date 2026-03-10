'use client';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  onDismiss?: () => void;
}

const typeStyles: Record<ToastType, string> = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  info: 'bg-slate-50 border-slate-200 text-slate-800',
};

export function Toast({ message, type = 'info', onDismiss }: ToastProps) {
  return (
    <div
      role="alert"
      className={`flex items-center justify-between rounded-lg border px-4 py-3 ${typeStyles[type]}`}
    >
      <span className="text-sm font-medium">{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="ml-4 rounded p-1 hover:opacity-80"
          aria-label="Dismiss"
        >
          ×
        </button>
      )}
    </div>
  );
}
