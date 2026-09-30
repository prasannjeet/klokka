import type { Dictionary } from '@/lib/i18n';
import { cloneCommand, repoHost, repoUrl } from '@/lib/links';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

/** The big MIT card: the licence, the clone command and the GitHub link (homepage open source section, /oppen-kallkod). */
export function RepoCard({ t, className }: { t: Dictionary; className?: string }) {
  const o = t.openSource;
  return (
    <div className={cn('card oss-big', className)}>
      <div className="mit" role="img" aria-label={o.mitLabel}>
        MIT
      </div>
      <p className="lead max-w-[40ch]">{o.mitBody}</p>
      <code className="code" aria-label={o.cloneLabel}>
        {cloneCommand}
      </code>
      <a className="gh" href={repoUrl}>
        <Icon name="github" />
        {repoHost}
      </a>
    </div>
  );
}
