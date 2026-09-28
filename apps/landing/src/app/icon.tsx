import { color } from '@klokka/tokens';
import {
  MARK_BODY,
  MARK_HANDS,
  MARK_HANDS_STROKE_WIDTH,
  MARK_HANDS_TRANSFORM,
  MARK_VIEWBOX,
} from '@/lib/mark';

export const contentType = 'image/svg+xml';

/** The favicon: the mark in the theme primary (magenta reads on light and dark tabs alike). */
export default function Icon() {
  const fill = color.dark.primary;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MARK_VIEWBOX}"><g fill="${fill}" fill-rule="evenodd"><path d="${MARK_BODY}"/><path d="${MARK_HANDS}" stroke="${fill}" stroke-width="${MARK_HANDS_STROKE_WIDTH}" stroke-linejoin="round" transform="${MARK_HANDS_TRANSFORM}"/></g></svg>`;
  return new Response(svg, { headers: { 'Content-Type': contentType } });
}
