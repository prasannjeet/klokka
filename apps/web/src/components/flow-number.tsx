'use client';

// Big figures count to their new value when it changes (NumberFlow, motion vocabulary "Pop" for numbers);
// NumberFlow respects reduced motion by itself and formats with the locale's separators.
import NumberFlow from '@number-flow/react';
import { intlLocale } from '@klokka/core';
import { useLocale } from '@/lib/i18n';

export function FlowNumber({ value, digits = 2 }: { value: number; digits?: number }) {
  const locale = useLocale();
  return (
    <NumberFlow
      value={value}
      locales={intlLocale(locale)}
      format={{ maximumFractionDigits: digits, minimumFractionDigits: 0 }}
    />
  );
}
