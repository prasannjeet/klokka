import { Icon, type IconName } from '@/components/ui/Icon';
import type { Dictionary } from '@/lib/i18n';

const ICONS: readonly IconName[] = ['clock', 'flag', 'lock', 'users', 'zap', 'download', 'check', 'bell'];

/** Things Klokka tells people, as a marquee: the list twice, the copy hidden from assistive tech. */
export function Ticker({ t }: { t: Dictionary }) {
  const set = (copy: boolean) => (
    <ul
      className={copy ? 'set copy' : 'set'}
      aria-hidden={copy || undefined}
      aria-label={copy ? undefined : t.ticker.label}
    >
      {t.ticker.items.map((item, i) => (
        <li key={item} className="item">
          <Icon name={ICONS[i % ICONS.length] ?? 'clock'} />
          {item}
        </li>
      ))}
    </ul>
  );
  return (
    <div className="ticker">
      <div className="ticker-track">
        {set(false)}
        {set(true)}
      </div>
    </div>
  );
}
