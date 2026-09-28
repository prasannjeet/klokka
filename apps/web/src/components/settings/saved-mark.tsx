'use client';

import { useT } from '@/lib/i18n';
import { Icon } from '../icons';

// The "Saved" pop next to a settings row that just saved (motion vocabulary: Pop).
export function SavedMark({ show }: { show: boolean }) {
  const t = useT();
  return (
    <span className="saved-slot" role="status" aria-live="polite">
      {show ? (
        <span className="saved">
          <Icon name="check" />
          {t('web.settings.saved')}
        </span>
      ) : null}
    </span>
  );
}
