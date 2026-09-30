import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import { color } from '@klokka/tokens';
import { getDictionary, type Locale } from '@/lib/i18n';
import { pageCopy } from '@/lib/i18n/pages';
import { siteUrl } from '@/lib/links';
import {
  MARK_BODY,
  MARK_HANDS,
  MARK_HANDS_STROKE_WIDTH,
  MARK_HANDS_TRANSFORM,
  MARK_VIEWBOX,
} from '@/lib/mark';
import { hrefFor, pageById, type CardBackground, type PageId } from '@/lib/pages';

// Images drawn with code at build time (the route handlers are force-static): each page's 1200x630 link card per
// language and the square logo. Nightshift dark from @klokka/tokens, the brand mark, the artwork in src/assets/og
// (from docs/brand/social/backgrounds, laid out as docs/brand/social/compose.mjs does), and the fonts from
// @fontsource (WOFF, which Satori reads; no network at build time for these).

const ink = color.dark;

// Turbopack turns require.resolve into its own module lookup, which cannot hand back a file path. Fonts and
// artwork are read from disk while the build prerenders these routes (cwd is apps/landing), so use Node's
// resolver directly.
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

/** A token colour (#RRGGBB) at an opacity, for the scrims. */
function alpha(hex: string, opacity: number): string {
  const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
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

/** The mark and the "klokka" wordmark, `size` px tall. */
function Logo({ size }: { size: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.28 }}>
      <MarkSvg size={size} fill={ink.primary} />
      <div
        style={{
          fontFamily: 'Unbounded',
          fontSize: size * 0.78,
          lineHeight: 1,
          letterSpacing: '-0.02em',
          color: ink.text,
        }}
      >
        klokka
      </div>
    </div>
  );
}

// The artwork is 1200x679 (the backgrounds' 2688x1520 at the card's width).
const ART = { width: 1200, height: 679 };
const CARD = { width: 1200, height: 630 };

type Artwork = 'phones-sv' | 'phones-en' | 'grid' | 'clock' | 'cafe';

function artwork(background: CardBackground, locale: Locale): Artwork {
  return background === 'phones' ? `phones-${locale}` : background;
}

async function artworkUri(name: Artwork): Promise<string> {
  const data = await readFile(resolveFile(`./src/assets/og/${name}.jpg`));
  return `data:image/jpeg;base64,${data.toString('base64')}`;
}

/** The homepage's card: the phones fill the height on the right, the headline sits on a scrim on the left. */
function HomeCard({ art, locale }: { art: string; locale: Locale }) {
  const t = getDictionary(locale);
  const artWidth = Math.round((CARD.height * ART.width) / ART.height);
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        backgroundColor: ink.bg,
        fontFamily: 'Inter',
      }}
    >
      {/* eslint-disable-next-line -- no-img-element: Satori draws <img>, there is no next/image here (the root config has no Next plugin) */}
      <img
        src={art}
        alt=""
        width={artWidth}
        height={CARD.height}
        style={{ position: 'absolute', top: 0, right: 0 }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundImage: `linear-gradient(90deg, ${alpha(ink.bg, 0.94)} 0%, ${alpha(ink.bg, 0.8)} 40%, ${alpha(ink.bg, 0)} 66%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 72,
          top: 60,
          bottom: 60,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <Logo size={58} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontFamily: 'Unbounded',
              fontSize: 74,
              lineHeight: 1.04,
              letterSpacing: '-0.025em',
              color: ink.text,
            }}
          >
            <div>{t.hero.line1}</div>
            <div style={{ color: ink.primary, textShadow: `0 0 28px ${alpha(ink.primary, 0.55)}` }}>
              {t.hero.line2}
            </div>
          </div>
          <div style={{ fontSize: 25, fontWeight: 500, lineHeight: 1.3, color: ink.textMuted }}>
            {t.meta.card.title}
          </div>
        </div>
        <div
          style={{
            alignSelf: 'flex-start',
            display: 'flex',
            fontSize: 22,
            fontWeight: 600,
            lineHeight: 1,
            color: ink.text,
            padding: '11px 22px',
            border: `2px solid ${ink.border}`,
            borderRadius: 999,
            backgroundColor: alpha(ink.surface, 0.7),
          }}
        >
          {t.meta.cardPill}
        </div>
      </div>
    </div>
  );
}

/** Every other page's card: eyebrow, title and the page's address over its artwork. */
function PageCard({ art, id, locale }: { art: string; id: PageId; locale: Locale }) {
  const { card } = pageCopy(id, locale);
  // The phones stand further left than the clock (the left phone's edge is about 530 px in), so on that artwork
  // the eyebrow and title get a narrower column and a smaller title.
  const phones = pageById(id).background === 'phones';
  const address = `${siteUrl.replace(/^https?:\/\//, '')}${hrefFor(id, locale)}`;
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        backgroundColor: ink.bg,
        fontFamily: 'Inter',
      }}
    >
      {/* eslint-disable-next-line -- no-img-element: Satori draws <img>, there is no next/image here (the root config has no Next plugin) */}
      <img
        src={art}
        alt=""
        width={ART.width}
        height={ART.height}
        style={{ position: 'absolute', left: 0, top: (CARD.height - ART.height) / 2, opacity: 0.9 }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundImage: `linear-gradient(90deg, ${alpha(ink.bg, 0.95)} 0%, ${alpha(ink.bg, 0.8)} 50%, ${alpha(ink.bg, 0.1)} 80%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 72,
          top: 60,
          bottom: 60,
          // Clear of the artwork: the clock's rim starts about 760 px in (compose.mjs had 360, which lets a long
          // title run into it).
          right: 440,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <Logo size={50} />
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: 20, ...(phones ? { maxWidth: 440 } : {}) }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 600,
              lineHeight: 1,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: ink.primary,
            }}
          >
            {card.eyebrow}
          </div>
          <div
            style={{
              fontFamily: 'Unbounded',
              fontSize: phones ? 52 : 64,
              lineHeight: 1.08,
              letterSpacing: '-0.02em',
              color: ink.text,
            }}
          >
            {card.title}
          </div>
        </div>
        <div style={{ fontSize: 24, fontWeight: 500, lineHeight: 1, color: ink.textMuted }}>{address}</div>
      </div>
    </div>
  );
}

/** A page's 1200x630 link card as a JPEG (Satori draws PNG; the photographic artwork is far smaller as JPEG). */
export async function pageCard(id: PageId, locale: Locale): Promise<Response> {
  const art = await artworkUri(artwork(pageById(id).background, locale));
  const png = new ImageResponse(
    id === 'home' ? <HomeCard art={art} locale={locale} /> : <PageCard art={art} id={id} locale={locale} />,
    { ...CARD, fonts: await fonts() },
  );
  const jpeg = await sharp(Buffer.from(await png.arrayBuffer()))
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
  return new Response(new Uint8Array(jpeg), {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400' },
  });
}

const mesh = `radial-gradient(80% 60% at 88% -10%, ${ink.mesh1} 0%, transparent 62%), radial-gradient(60% 50% at -10% 105%, ${ink.mesh2} 0%, transparent 62%), radial-gradient(50% 45% at 60% 80%, ${ink.mesh3} 0%, transparent 62%)`;

/**
 * A square logo: the Organization logo in JSON-LD, the apple icon and the manifest icons. `maskable` draws the
 * mark at 56% so it stays inside the 80% safe circle a launcher may crop to; the default is 72%.
 */
export async function logoImage(size: number, opts: { maskable?: boolean } = {}): Promise<ImageResponse> {
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
      <MarkSvg size={Math.round(size * (opts.maskable ? 0.56 : 0.72))} fill={ink.primary} />
    </div>,
    { width: size, height: size },
  );
}
