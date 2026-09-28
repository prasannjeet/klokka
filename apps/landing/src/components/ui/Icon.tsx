import { cn } from '@/lib/cn';

export type IconName =
  | 'clock'
  | 'check'
  | 'bell'
  | 'grid'
  | 'zap'
  | 'note'
  | 'lock'
  | 'download'
  | 'flag'
  | 'history'
  | 'calendar'
  | 'share'
  | 'users'
  | 'moon'
  | 'sun'
  | 'plus'
  | 'arrow'
  | 'up'
  | 'info'
  | 'github'
  | 'android'
  | 'x';

/** A decorative icon from the sprite in IconSprite. Always aria-hidden: the text next to it carries meaning. */
export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg className={cn('icon', className)} aria-hidden="true" focusable="false">
      <use href={`#i-${name}`} />
    </svg>
  );
}

/** The Klokka mark in currentColor. */
export function Mark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 2048 2048" aria-hidden="true" focusable="false">
      <use href="#i-mark" />
    </svg>
  );
}
