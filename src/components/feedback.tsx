import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { HiOutlineCheckCircle, HiOutlineExclamationTriangle, HiOutlineInformationCircle, HiOutlineXMark } from 'react-icons/hi2';
import { Modal } from './layout';
import { Button } from './ui';

type ToastType = 'success' | 'error' | 'info';
type Toast = { id: string; type: ToastType; title: string; message?: string };
type ToastContextValue = { push: (toast: Omit<Toast, 'id'>) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => setToasts((items) => items.filter((toast) => toast.id !== id)), []);
  const push = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = crypto.randomUUID();
      setToasts((items) => [...items, { ...toast, id }]);
      window.setTimeout(() => dismiss(id), 4200);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-50 flex w-[min(420px,calc(100vw-2rem))] flex-col gap-3" role="status" aria-live="polite">
        {toasts.map((toast) => {
          const Icon = toast.type === 'success' ? HiOutlineCheckCircle : toast.type === 'error' ? HiOutlineExclamationTriangle : HiOutlineInformationCircle;
          return (
            <div key={toast.id} className="flex gap-3 rounded-lg border border-border bg-surface p-4 shadow-soft">
              <Icon className={toast.type === 'error' ? 'mt-0.5 h-5 w-5 text-danger' : toast.type === 'success' ? 'mt-0.5 h-5 w-5 text-success' : 'mt-0.5 h-5 w-5 text-primary'} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{toast.title}</p>
                {toast.message ? <p className="mt-1 text-sm text-muted">{toast.message}</p> : null}
              </div>
              <button aria-label="Dismiss notification" className="rounded-md p-1 text-muted hover:bg-slate-100" onClick={() => dismiss(toast.id)}>
                <HiOutlineXMark className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-primary" />
      <span>{label}</span>
    </span>
  );
}

export function EmptyState({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface p-8 text-center">
      <p className="text-base font-semibold text-foreground">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm text-muted">{message}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }: { title?: string; message?: string; onRetry?: () => void }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-900">
      <p className="font-semibold">{title}</p>
      {message ? <p className="mt-1">{message}</p> : null}
      {onRetry ? (
        <button className="mt-3 rounded-md border border-red-300 bg-white px-3 py-2 font-medium hover:bg-red-100" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}

export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-14 animate-pulse rounded-md bg-slate-100" />
      ))}
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  danger,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <Modal title={title} onClose={onClose} width="max-w-lg">
      <div className="grid gap-5">
        <p className="text-sm text-muted">{message}</p>
        <div className="sticky bottom-0 -mx-5 -mb-5 flex justify-end gap-3 border-t border-border bg-surface px-5 py-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="button" variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </Modal>
  );
}
