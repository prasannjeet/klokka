import { color } from '@klokka/tokens';
import {
  MARK_BODY,
  MARK_HANDS,
  MARK_HANDS_STROKE_WIDTH,
  MARK_HANDS_TRANSFORM,
  MARK_VIEWBOX,
} from '@/lib/mark';

// favicon.ico (16/32/48, transparent) and apple-icon.png (180, opaque Nightshift background) next to this file
// are the same mark as PNGs, for clients that skip SVG icons. Regenerate from the repo root with Pillow:
// python3 -c "from PIL import Image;m=Image.open('docs/brand/final/klokka-mark-heavy.png').convert('RGBA');m=m.crop(m.getbbox());exec('def g(n,f,bg=(0,0,0,0)):\n k=n*f/max(m.size);a=m.getchannel(\'A\').resize((round(m.width*k),round(m.height*k)),Image.LANCZOS);p=Image.new(\'RGBA\',a.size,\'#FF006E\');p.putalpha(a);o=Image.new(\'RGBA\',(n,n),bg);o.alpha_composite(p,((n-a.width)//2,(n-a.height)//2));return o');g(180,.7,'#0D0620').convert('RGB').save('apps/web/src/app/apple-icon.png');i=[g(n,.94) for n in (48,32,16)];i[0].save('apps/web/src/app/favicon.ico',sizes=[(48,48),(32,32),(16,16)],append_images=i[1:])"
export const contentType = 'image/svg+xml';

/** The favicon: the mark in the theme primary (magenta reads on light and dark tabs alike). */
export default function Icon() {
  const fill = color.dark.primary;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MARK_VIEWBOX}"><g fill="${fill}" fill-rule="evenodd"><path d="${MARK_BODY}"/><path d="${MARK_HANDS}" stroke="${fill}" stroke-width="${MARK_HANDS_STROKE_WIDTH}" stroke-linejoin="round" transform="${MARK_HANDS_TRANSFORM}"/></g></svg>`;
  return new Response(svg, { headers: { 'Content-Type': contentType } });
}
