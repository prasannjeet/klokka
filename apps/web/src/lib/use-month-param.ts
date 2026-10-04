'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { compareDates, type IsoMonth } from '@klokka/core';

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

// ?month=2026-09 in the URL (shareable, back button works); never later than `latest`, the current month
// unless the page plans ahead (the month views, CHQ-156: jobs can be planned on future days).
export function useMonthParam(
  current: IsoMonth,
  latest: IsoMonth = current,
): [IsoMonth, (month: IsoMonth) => void] {
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const raw = search.get('month');
  const month = raw && MONTH_RE.test(raw) && compareDates(raw, latest) <= 0 ? raw : current;
  const set = (next: IsoMonth) => {
    const params = new URLSearchParams(search.toString());
    if (next === current) params.delete('month');
    else params.set('month', next);
    const q = params.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  };
  return [month, set];
}
