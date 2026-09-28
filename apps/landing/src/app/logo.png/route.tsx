import { logoImage } from '@/lib/brand-image';

export const dynamic = 'force-static';

/** /logo.png: 512x512, the mark on Nightshift night. */
export async function GET() {
  return logoImage(512);
}
