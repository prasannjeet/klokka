import { logoImage } from '@/lib/brand-image';

export const dynamic = 'force-static';

/** /icon-192.png: the manifest icon, 192x192. */
export async function GET() {
  return logoImage(192);
}
