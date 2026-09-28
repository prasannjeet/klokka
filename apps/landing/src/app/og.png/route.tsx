import { socialCard } from '@/lib/brand-image';

export const dynamic = 'force-static';

/** /og.png: the Swedish social card, 1200x630. */
export async function GET() {
  return socialCard('sv');
}
