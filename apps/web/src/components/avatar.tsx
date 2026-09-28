import { avatarClass, initials } from '@/lib/visual';

export function Avatar({
  name,
  emoji,
  index = 0,
  size,
}: {
  name: string;
  emoji?: string | null | undefined;
  index?: number;
  size?: 'sm' | 'lg' | 'xl';
}) {
  const cls = ['av', emoji ? 'emoji' : avatarClass(index), size ?? ''].filter(Boolean).join(' ');
  return (
    <span className={cls} aria-hidden="true">
      {emoji || initials(name)}
    </span>
  );
}
