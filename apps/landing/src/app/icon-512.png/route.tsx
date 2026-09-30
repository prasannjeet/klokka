import { logoImage } from '@/lib/brand-image';

export const dynamic = 'force-static';

/** /icon-512.png: the manifest icon, 512x512. */
export async function GET() {
  return logoImage(512);
}
