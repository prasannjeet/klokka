import { en, locales } from '@/lib/i18n';
import { pageCopy } from '@/lib/i18n/pages';
import { footerColumns, hrefFor, type PageId } from '@/lib/pages';
import { plainText } from '@/lib/rich-text';
import { absolute } from '@/lib/seo';

export const dynamic = 'force-static';

/** One line per language (Swedish first): "- [title](url): description". */
function entries(id: PageId): string[] {
  return locales.map((locale) => {
    const meta = pageCopy(id, locale).meta;
    return `- [${meta.title}](${absolute(hrefFor(id, locale))}): ${meta.description}`;
  });
}

/** /llms.txt: what Klokka is, then every page by footer group, both languages, all from the registry. */
export function GET() {
  const lines = [
    '# Klokka',
    '',
    `> ${plainText(pageCopy('home', 'en').lede.join(' '))}`,
    '',
    ...entries('home'),
    ...footerColumns('en').flatMap((column) => [
      '',
      `## ${en.footer.groups[column.group]}`,
      '',
      ...column.links.flatMap((link) => entries(link.id)),
    ]),
  ];
  return new Response(`${lines.join('\n')}\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
