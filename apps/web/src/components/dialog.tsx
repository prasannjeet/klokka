'use client';

// A modal on the platform's <dialog>: focus is trapped and returned, Escape closes, the page behind is
// inert. A bottom sheet on phones (CSS). Opening pops, closing is immediate (motion vocabulary: nothing
// pops out).
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { useT } from '@/lib/i18n';
import { Icon } from './icons';

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
}) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dlg"
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {open ? (
        <div className="dlg-body">
          <button type="button" className="close" aria-label={t('common.close')} onClick={onClose}>
            <Icon name="x" />
          </button>
          <h2 id={titleId}>{title}</h2>
          {description ? (
            <p className="sub" id={descId}>
              {description}
            </p>
          ) : null}
          {children}
        </div>
      ) : null}
    </dialog>
  );
}
