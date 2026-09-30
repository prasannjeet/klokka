import type { Locale } from '@/lib/i18n';
import { hrefFor, type PageId } from '@/lib/pages';
import { parseRichText } from '@/lib/rich-text';

/**
 * A copy string with its inline links. Page links go through the registry (an unknown id throws, so the build
 * fails rather than shipping a dead link); the rest are plain text nodes, never HTML. `inline-link` marks a link
 * inside running text, which the tap-size check skips (WCAG 2.5.8 exempts inline links).
 */
export function RichText({ text, locale }: { text: string; locale: Locale }) {
  return parseRichText(text).map((part, i) => {
    if (part.kind === 'text') return part.text;
    if (part.kind === 'page')
      return (
        <a key={i} className="inline-link" href={hrefFor(part.id as PageId, locale)}>
          {part.label}
        </a>
      );
    const external = part.href.startsWith('https://');
    return (
      <a key={i} className="inline-link" href={part.href} rel={external ? 'noopener' : undefined}>
        {part.label}
      </a>
    );
  });
}
