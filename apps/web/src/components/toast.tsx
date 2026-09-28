'use client';

// Toasts: a polite live region, one message per action ("Saved as one batch", "Invitation sent"),
// dismissed after a few seconds or by hand. Pop in, fade out, nothing else (docs/design/DIRECTION.md).
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { useT } from '@/lib/i18n';
import { Icon, type IconName } from './icons';

export interface ToastInput {
  title: string;
  body?: string;
  icon?: IconName;
  tone?: 'info' | 'error';
}

interface ToastItem extends ToastInput {
  id: number;
}

const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);
const TOAST_MS = 5200;

export function ToastProvider({ children, bare = false }: { children: ReactNode; bare?: boolean }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const next = useRef(1);
  const t = useT();
  const dismiss = useCallback((id: number) => setItems((all) => all.filter((x) => x.id !== id)), []);
  const show = useCallback(
    (toast: ToastInput) => {
      const id = next.current++;
      setItems((all) => [...all.slice(-2), { ...toast, id }]);
      window.setTimeout(() => dismiss(id), TOAST_MS);
    },
    [dismiss],
  );
  const value = useMemo(() => show, [show]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={bare ? 'toasts bare' : 'toasts'} role="status" aria-live="polite">
        {items.map((item) => (
          <div key={item.id} className={item.tone === 'error' ? 'toast bad' : 'toast'}>
            <span className="t-app">
              <Icon name={item.icon ?? (item.tone === 'error' ? 'alert' : 'check')} />
            </span>
            <div>
              <b>{item.title}</b>
              {item.body ? <span>{item.body}</span> : null}
            </div>
            <button
              type="button"
              className="x"
              aria-label={t('common.close')}
              onClick={() => dismiss(item.id)}
            >
              <Icon name="x" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): (toast: ToastInput) => void {
  const show = useContext(ToastContext);
  if (!show) throw new Error('useToast outside <ToastProvider>');
  return show;
}
