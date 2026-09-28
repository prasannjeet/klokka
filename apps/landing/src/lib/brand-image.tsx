import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { color } from '@klokka/tokens';
import { getDictionary, type Locale } from '@/lib/i18n';
import {
  MARK_BODY,
  MARK_HANDS,
  MARK_HANDS_STROKE_WIDTH,
  MARK_HANDS_TRANSFORM,
  MARK_VIEWBOX,
} from '@/lib/mark';

// Images drawn with code at build time (the route handlers are force-static): the 1200x630 social card per
// language and the square logo. Nightshift dark from @klokka/tokens, the brand mark, the railway clock, and
// the fonts from @fontsource (WOFF, which Satori reads; no network at build time for these).

const ink = color.dark;

// Turbopack turns require.resolve into its own module lookup, which cannot hand back a file path. The fonts are
// read from disk while the build prerenders these routes (cwd is apps/landing), so use Node's resolver directly.
const { createRequire } = process.getBuiltinModule('node:module');
const resolveFile = createRequire(path.join(process.cwd(), 'package.json')).resolve;

async function font(file: string): Promise<ArrayBuffer> {
  const buffer = await readFile(resolveFile(file));
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

async function fonts() {
  return [
    {
      name: 'Unbounded',
      data: await font('@fontsource/unbounded/files/unbounded-latin-800-normal.woff'),
      weight: 800 as const,
      style: 'normal' as const,
    },
    {
      name: 'Inter',
      data: await font('@fontsource/inter/files/inter-latin-500-normal.woff'),
      weight: 500 as const,
      style: 'normal' as const,
    },
    {
      name: 'Inter',
      data: await font('@fontsource/inter/files/inter-latin-600-normal.woff'),
      weight: 600 as const,
      style: 'normal' as const,
    },
  ];
}

function MarkSvg({ size, fill }: { size: number; fill: string }) {
  return (
    <svg width={size} height={size} viewBox={MARK_VIEWBOX}>
      <g fill={fill} fillRule="evenodd">
        <path d={MARK_BODY} />
        <path
          d={MARK_HANDS}
          stroke={fill}
          strokeWidth={MARK_HANDS_STROKE_WIDTH}
          strokeLinejoin="round"
          transform={MARK_HANDS_TRANSFORM}
        />
      </g>
    </svg>
  );
}

/** The hero's railway clock at 10:09:30, the watchmaker's resting time. */
function ClockSvg({ size }: { size: number }) {
  const ticks = Array.from({ length: 60 }, (_, i) => i);
  return (
    <svg width={size} height={size} viewBox="0 0 200 200">
      <circle cx="100" cy="100" r="97" fill={ink.surface} stroke={ink.rule} strokeWidth="3" />
      {ticks.map((i) => {
        const hour = i % 5 === 0;
        return (
          <rect
            key={i}
            x={hour ? 96.5 : 98.6}
            y="9"
            width={hour ? 7 : 2.8}
            height={hour ? 24 : 9}
            fill={ink.text}
            transform={`rotate(${i * 6} 100 100)`}
          />
        );
      })}
      <rect
        x="94.5"
        y="44"
        width="11"
        height="70"
        rx="1.5"
        fill={ink.text}
        transform="rotate(304.75 100 100)"
      />
      <rect x="95.5" y="16" width="9" height="98" rx="1.5" fill={ink.text} transform="rotate(54 100 100)" />
      <g transform="rotate(184.6 100 100)">
        <rect x="99" y="34" width="2" height="92" fill={ink.primary} />
        <circle cx="100" cy="44" r="9.5" fill={ink.primary} />
      </g>
      <circle cx="100" cy="100" r="4" fill={ink.text} />
    </svg>
  );
}

const mesh = `radial-gradient(80% 60% at 88% -10%, ${ink.mesh1} 0%, transparent 62%), radial-gradient(60% 50% at -10% 105%, ${ink.mesh2} 0%, transparent 62%), radial-gradient(50% 45% at 60% 80%, ${ink.mesh3} 0%, transparent 62%)`;

export async function socialCard(locale: Locale): Promise<ImageResponse> {
  const t = getDictionary(locale);
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '64px 72px',
        backgroundColor: ink.bg,
        backgroundImage: mesh,
        color: ink.text,
        fontFamily: 'Inter',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <MarkSvg size={64} fill={ink.primary} />
          <div style={{ fontFamily: 'Unbounded', fontSize: 50, letterSpacing: '-0.02em' }}>klokka</div>
        </div>
        <div
          style={{
            display: 'flex',
            padding: '10px 22px',
            borderRadius: 999,
            border: `2px solid ${ink.border}`,
            fontSize: 24,
            fontWeight: 600,
            color: ink.text,
          }}
        >
          {t.hero.badge}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', fontFamily: 'Unbounded', lineHeight: 1 }}>
          <div style={{ fontSize: 112, letterSpacing: '-0.02em' }}>{t.hero.line1}</div>
          <div style={{ fontSize: 112, letterSpacing: '-0.02em', color: ink.primary, marginTop: 8 }}>
            {t.hero.line2}
          </div>
        </div>
        <ClockSvg size={236} />
      </div>
      <div style={{ display: 'flex', fontSize: 32, fontWeight: 500, color: ink.textMuted }}>
        {t.meta.ogLine}
      </div>
    </div>,
    { width: 1200, height: 630, fonts: await fonts() },
  );
}

/** A square logo (the Organization logo in JSON-LD and the manifest icon). */
export async function logoImage(size: number): Promise<ImageResponse> {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: ink.bg,
        backgroundImage: mesh,
      }}
    >
      <MarkSvg size={Math.round(size * 0.72)} fill={ink.primary} />
    </div>,
    { width: size, height: size },
  );
}
