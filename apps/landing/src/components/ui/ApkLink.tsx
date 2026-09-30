import { cn } from '@/lib/cn';
import type { Dictionary } from '@/lib/i18n';
import { apkUrl } from '@/lib/links';
import { Icon } from './Icon';

/** "Get the Android app": the signed release APK (through /download/android), with the one-line sideloading note. */
export function ApkLink({
  t,
  variant = 'secondary',
}: {
  t: Dictionary;
  variant?: 'secondary' | 'on-primary';
}) {
  return (
    <div className="apk">
      <a
        className={cn('btn', variant === 'secondary' ? 'btn-secondary' : 'on-primary-btn')}
        href={apkUrl}
        type="application/vnd.android.package-archive"
      >
        <Icon name="android" />
        {t.apk.cta}
      </a>
      <p>{t.apk.note}</p>
    </div>
  );
}
