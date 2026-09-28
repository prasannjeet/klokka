'use client';

// Every money figure goes through here (CHQ-128): nothing is rendered unless the workspace shows pay, even if
// a value is at hand. The API already sends null for money when pay is off or the member has no hourly rate
// (CHQ-145); this is the second lock.
import { formatMoney } from '@klokka/core';
import { useLocale } from '@/lib/i18n';

export function Money({
  amount,
  currency,
  showPay,
  block,
  className,
}: {
  amount: number | null | undefined;
  currency: string;
  showPay: boolean;
  block?: boolean;
  className?: string;
}) {
  const locale = useLocale();
  if (!showPay || amount == null) return null;
  const cls = ['money', block ? 'blk' : '', className ?? ''].filter(Boolean).join(' ');
  return <span className={cls}>{formatMoney(amount, currency, locale)}</span>;
}
