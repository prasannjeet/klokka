import type { MetadataRoute } from 'next';
import { color } from '@klokka/tokens';
import { sv } from '@/lib/i18n';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Klokka',
    short_name: 'Klokka',
    description: sv.meta.description,
    start_url: '/',
    lang: 'sv-SE',
    display: 'browser',
    background_color: color.dark.bg,
    theme_color: color.dark.bg,
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
