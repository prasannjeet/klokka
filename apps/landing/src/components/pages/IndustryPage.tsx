import { RichText } from '@/components/RichText';
import { Icon } from '@/components/ui/Icon';
import type { Locale } from '@/lib/i18n';
import { pageCopy } from '@/lib/i18n/pages';
import type { PageId } from '@/lib/pages';
import { tradeRows } from '@/lib/sample';
import { ProductLayout, WeekVisual } from './ProductPage';

type IndustryId = Extract<PageId, `trade-${string}`>;

export function isIndustryId(id: PageId): id is IndustryId {
  return id.startsWith('trade-');
}

/**
 * A trade page: the product page shell, the trade's personalliggare line right under the lede (first screen on a
 * phone), and a week grid with the trade's own example week.
 */
export function IndustryPage({ id, locale }: { id: IndustryId; locale: Locale }) {
  const copy = pageCopy(id, locale);
  return (
    <ProductLayout
      id={id}
      locale={locale}
      notice={
        <p className="card trade-notice">
          <Icon name="info" />
          <span>
            <RichText text={copy.notice} locale={locale} />
          </span>
        </p>
      }
      visual={
        <WeekVisual
          card={{
            label: copy.week.label,
            title: copy.week.title,
            subtitle: copy.week.subtitle,
            gridLabel: copy.week.label,
            caption: copy.week.caption,
          }}
          rows={tradeRows[id]}
          locale={locale}
        />
      }
    />
  );
}
