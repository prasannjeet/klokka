// The inline link syntax of the page copy (i18n/pages/types.ts), parsed without any HTML: `[label](page:<id>)`,
// `[label](https://...)` and `[label](mailto:...)`. Anything else, including a malformed link, stays plain text.

export type RichPart =
  | { kind: 'text'; text: string }
  | { kind: 'page'; label: string; id: string }
  | { kind: 'external'; label: string; href: string };

const LINK = /\[([^\]]+)\]\((page:[a-z0-9-]+|https:\/\/[^\s)]+|mailto:[^\s)]+)\)/g;

export function parseRichText(text: string): RichPart[] {
  const parts: RichPart[] = [];
  let last = 0;
  for (const match of text.matchAll(LINK)) {
    const [whole, label = '', target = ''] = match;
    if (match.index > last) parts.push({ kind: 'text', text: text.slice(last, match.index) });
    parts.push(
      target.startsWith('page:')
        ? { kind: 'page', label, id: target.slice('page:'.length) }
        : { kind: 'external', label, href: target },
    );
    last = match.index + whole.length;
  }
  if (last < text.length) parts.push({ kind: 'text', text: text.slice(last) });
  return parts;
}

/** The text a reader sees, links reduced to their labels (JSON-LD answers, llms.txt). */
export function plainText(text: string): string {
  return parseRichText(text)
    .map((part) => (part.kind === 'text' ? part.text : part.label))
    .join('');
}
