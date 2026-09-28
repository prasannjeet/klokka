import {
  MARK_BODY,
  MARK_HANDS,
  MARK_HANDS_STROKE_WIDTH,
  MARK_HANDS_TRANSFORM,
  MARK_VIEWBOX,
} from '@/lib/mark';

/**
 * One inline sprite for the page: the brand mark and the Lucide-style icons (24 grid, 2 px stroke, round
 * caps) from the mockup. Everything else references them with <use>, so the mark's paths ship once.
 */
export function IconSprite() {
  return (
    <svg width="0" height="0" className="sprite" aria-hidden="true" focusable="false">
      <symbol id="i-mark" viewBox={MARK_VIEWBOX}>
        <g fill="currentColor" fillRule="evenodd">
          <path d={MARK_BODY} />
          <path
            d={MARK_HANDS}
            stroke="currentColor"
            strokeWidth={MARK_HANDS_STROKE_WIDTH}
            strokeLinejoin="round"
            transform={MARK_HANDS_TRANSFORM}
          />
        </g>
      </symbol>
      <symbol id="i-clock" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </symbol>
      <symbol id="i-check" viewBox="0 0 24 24">
        <path d="M5 12.5l4.2 4.2L19 7" />
      </symbol>
      <symbol id="i-bell" viewBox="0 0 24 24">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10 21a2 2 0 0 0 4 0" />
      </symbol>
      <symbol id="i-grid" viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
      </symbol>
      <symbol id="i-zap" viewBox="0 0 24 24">
        <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
      </symbol>
      <symbol id="i-note" viewBox="0 0 24 24">
        <path d="M15 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M15 3v5h5M8 13h8M8 17h5" />
      </symbol>
      <symbol id="i-lock" viewBox="0 0 24 24">
        <rect x="4" y="11" width="16" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </symbol>
      <symbol id="i-download" viewBox="0 0 24 24">
        <path d="M12 3v12M6 11l6 6 6-6" />
        <path d="M4 21h16" />
      </symbol>
      <symbol id="i-flag" viewBox="0 0 24 24">
        <path d="M5 21V4h11l-1.5 4L16 12H5" />
      </symbol>
      <symbol id="i-history" viewBox="0 0 24 24">
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v5h5M12 8v4l3 2" />
      </symbol>
      <symbol id="i-calendar" viewBox="0 0 24 24">
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </symbol>
      <symbol id="i-share" viewBox="0 0 24 24">
        <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
        <path d="M16 6l-4-4-4 4M12 2v13" />
      </symbol>
      <symbol id="i-users" viewBox="0 0 24 24">
        <circle cx="9" cy="8" r="4" />
        <path d="M2 21a7 7 0 0 1 14 0" />
        <path d="M16 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-5-6.7" />
      </symbol>
      <symbol id="i-moon" viewBox="0 0 24 24">
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </symbol>
      <symbol id="i-sun" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </symbol>
      <symbol id="i-plus" viewBox="0 0 24 24">
        <path d="M12 5v14M5 12h14" />
      </symbol>
      <symbol id="i-arrow" viewBox="0 0 24 24">
        <path d="M5 12h14M13 6l6 6-6 6" />
      </symbol>
      <symbol id="i-up" viewBox="0 0 24 24">
        <path d="M3 17l6-6 4 4 8-8" />
        <path d="M14 7h7v7" />
      </symbol>
      <symbol id="i-info" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 8h.01" />
      </symbol>
      <symbol id="i-github" viewBox="0 0 24 24">
        <path d="M15 22v-4a3.4 3.4 0 0 0-1-2.6c3.1-.3 6.4-1.5 6.4-7a5.4 5.4 0 0 0-1.5-3.8 5 5 0 0 0-.1-3.7s-1.2-.4-3.9 1.4a13.4 13.4 0 0 0-7 0C5.2.5 4 .9 4 .9a5 5 0 0 0-.1 3.7A5.4 5.4 0 0 0 2.4 8.4c0 5.5 3.3 6.7 6.4 7A3.4 3.4 0 0 0 8 18v4" />
        <path d="M8 20c-4 1.5-4-2-6-2" />
      </symbol>
      <symbol id="i-android" viewBox="0 0 24 24">
        <rect x="5" y="9" width="14" height="10" rx="2" />
        <path d="M5 13h14M8 5.5l1.5 2.5M16 5.5L14.5 8M9 21v-2M15 21v-2" />
        <path d="M7 9a5 5 0 0 1 10 0" />
      </symbol>
      <symbol id="i-x" viewBox="0 0 24 24">
        <path d="M6 6l12 12M18 6L6 18" />
      </symbol>
    </svg>
  );
}
