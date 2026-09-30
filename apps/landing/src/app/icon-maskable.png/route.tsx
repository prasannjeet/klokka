import { logoImage } from '@/lib/brand-image';

export const dynamic = 'force-static';

/** /icon-maskable.png: the manifest's maskable icon, 512x512, the mark inside the safe circle. */
export async function GET() {
  return logoImage(512, { maskable: true });
}
