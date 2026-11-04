'use client';

import { usePathname } from 'next/navigation';
import Script from 'next/script';
import { useEffect } from 'react';
import { flushAnalytics, trackPage } from '@/lib/analytics';

/**
 * Umami's tracker with auto-tracking off, and a page view for every route change (CHQ-201). Rendered by the root
 * layout only when KLOKKA_UMAMI_URL and KLOKKA_UMAMI_WEBSITE_ID are set, so an unconfigured install sends nothing.
 */
export function UsageAnalytics({ url, websiteId }: { url: string; websiteId: string }) {
  const pathname = usePathname();
  useEffect(() => trackPage(pathname), [pathname]);
  return (
    <Script
      src={`${url}/script.js`}
      data-website-id={websiteId}
      data-auto-track="false"
      strategy="afterInteractive"
      onLoad={flushAnalytics}
    />
  );
}
