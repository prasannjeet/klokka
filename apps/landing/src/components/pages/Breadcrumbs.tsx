import { getDictionary, type Locale } from '@/lib/i18n';
import { breadcrumbs, type PageId } from '@/lib/pages';

/** The visible trail; the same list feeds the BreadcrumbList in the page's JSON-LD. */
export function Breadcrumbs({ id, locale }: { id: PageId; locale: Locale }) {
  const trail = breadcrumbs(id, locale);
  return (
    <nav className="crumbs" aria-label={getDictionary(locale).a11y.breadcrumbs}>
      <ol>
        {trail.map((crumb, i) =>
          i === trail.length - 1 ? (
            <li key={crumb.href} aria-current="page">
              {crumb.name}
            </li>
          ) : (
            <li key={crumb.href}>
              <a href={crumb.href}>{crumb.name}</a>
            </li>
          ),
        )}
      </ol>
    </nav>
  );
}
