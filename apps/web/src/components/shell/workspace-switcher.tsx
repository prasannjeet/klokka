'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { MyWorkspace } from '@klokka/api-client';
import { useT } from '@/lib/i18n';
import { colourVar } from '@/lib/visual';
import { roleLine } from './role-line';

// The current workspace (name, colour, emoji, role). Switching arrives with CHQ-115.
export function WorkspaceSwitcher({ current, variant }: { current: MyWorkspace; variant: 'rail' | 'top' }) {
  const t = useT();
  return (
    <div className="ws">
      <Link className="ws-btn" href={`/w/${current.slug}`} aria-label={current.name}>
        <span
          className="ws-em"
          style={{ '--ws-color': colourVar(current.colour) } as CSSProperties}
          aria-hidden="true"
        >
          {current.emoji}
        </span>
        <span>
          <b>{current.name}</b>
          {variant === 'rail' ? <span>{roleLine(t, current)}</span> : null}
        </span>
        <span />
      </Link>
    </div>
  );
}
