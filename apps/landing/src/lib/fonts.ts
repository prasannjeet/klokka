import { Inter, JetBrains_Mono, Unbounded } from 'next/font/google';

// The Nightshift families (@klokka/tokens font.google), self-hosted by next/font. globals.css points the
// token stacks (--font-display, --font-body, --font-mono) at these variables.

/** Display face: headings, the wordmark, big numbers. The tokens set weight 800 and scale 0.8. */
export const unbounded = Unbounded({
  subsets: ['latin'],
  weight: ['800'],
  display: 'swap',
  variable: '--font-unbounded',
});

export const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

/** The clone command only. */
export const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
  variable: '--font-jetbrains',
  preload: false,
});

export const fontVariables = `${unbounded.variable} ${inter.variable} ${jetbrains.variable}`;
