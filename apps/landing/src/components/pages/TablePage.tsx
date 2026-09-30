import { RichText } from '@/components/RichText';
import { getDictionary, type Locale } from '@/lib/i18n';
import { pageCopy, type TableCopy } from '@/lib/i18n/pages';
import { num } from '@/lib/i18n/pages/hours';
import { hrefFor, type PageId } from '@/lib/pages';
import {
  bridgeDays,
  HOURS_PER_DAY,
  isWeekend,
  monthTable,
  swedishHolidays,
  yearTotals,
} from '@/lib/workdays';
import { Breadcrumbs } from './Breadcrumbs';
import { CtaBand } from './CtaBand';
import { FaqList } from './FaqList';
import { PageShell } from './PageShell';

type TableId = Extract<PageId, 'hours' | 'hours-2026' | 'hours-2027'>;
type YearId = Exclude<TableId, 'hours'>;

/** The year each year page tables; the hub summarises all of them, in this order. */
const years: Record<YearId, number> = { 'hours-2026': 2026, 'hours-2027': 2027 };

export function isTableId(id: PageId): id is TableId {
  return id === 'hours' || id in years;
}

const dateLocale: Record<Locale, string> = { sv: 'sv-SE', en: 'en-GB' };

/** 'torsdag 1 januari' / 'Thursday 1 January'. */
function longDate(date: string, locale: Locale): string {
  return new Intl.DateTimeFormat(dateLocale[locale], {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

function fill(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (whole, key: string) => String(values[key] ?? whole));
}

/**
 * A table that may be wider than a phone: it scrolls inside its own focusable region (keyboard users can scroll
 * it too), never the page. The caption names the region.
 */
function ScrollTable({ id, caption, children }: { id: string; caption: string; children: React.ReactNode }) {
  return (
    <div className="table-scroll" role="region" aria-labelledby={id} tabIndex={0}>
      <table className="data-table">
        <caption id={id}>{caption}</caption>
        {children}
      </table>
    </div>
  );
}

/** One year: working days by law and in practice, full-time and part-time hours, and the year's total. */
function YearTable({ year, copy, locale }: { year: number; copy: TableCopy; locale: Locale }) {
  const c = copy.columns;
  const rows = monthTable(year);
  const totals = yearTotals(year);
  const hours = (days: number, share = 1) => num(days * HOURS_PER_DAY * share, locale);
  return (
    <ScrollTable id={`table-${year}`} caption={fill(c.caption, { year })}>
      <colgroup>
        <col />
      </colgroup>
      <colgroup span={2} />
      <colgroup span={3} />
      <thead>
        <tr>
          <th scope="col" rowSpan={2}>
            {c.month}
          </th>
          <th scope="colgroup" colSpan={2}>
            {c.days}
          </th>
          <th scope="colgroup" colSpan={3}>
            {c.hours}
          </th>
        </tr>
        <tr>
          <th scope="col">{c.legal}</th>
          <th scope="col">{c.practice}</th>
          <th scope="col">{c.fullTime}</th>
          <th scope="col">{c.part75}</th>
          <th scope="col">{c.part50}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.month}>
            <th scope="row">{copy.monthNames[row.month - 1]}</th>
            <td>{row.legalDays}</td>
            <td>{row.practiceDays}</td>
            <td>{hours(row.practiceDays)}</td>
            <td>{hours(row.practiceDays, 0.75)}</td>
            <td>{hours(row.practiceDays, 0.5)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <th scope="row">{c.total}</th>
          <td>{totals.legalDays}</td>
          <td>{totals.practiceDays}</td>
          <td>{hours(totals.practiceDays)}</td>
          <td>{hours(totals.practiceDays, 0.75)}</td>
          <td>{hours(totals.practiceDays, 0.5)}</td>
        </tr>
      </tfoot>
    </ScrollTable>
  );
}

/** The hub's summary: working days in practice and full-time hours per month, one column pair per year. */
function SummaryTable({ copy, locale }: { copy: TableCopy; locale: Locale }) {
  const c = copy.columns;
  const tables = Object.values(years).map((year) => ({
    year,
    rows: monthTable(year),
    totals: yearTotals(year),
  }));
  return (
    <ScrollTable id="table-summary" caption={c.summaryCaption}>
      <colgroup>
        <col />
      </colgroup>
      {tables.map((t) => (
        <colgroup key={t.year} span={2} />
      ))}
      <thead>
        <tr>
          <th scope="col" rowSpan={2}>
            {c.month}
          </th>
          {tables.map((t) => (
            <th key={t.year} scope="colgroup" colSpan={2}>
              {t.year}
            </th>
          ))}
        </tr>
        <tr>
          {tables.map((t) => [
            <th key={`${t.year}-days`} scope="col">
              {c.days}
            </th>,
            <th key={`${t.year}-hours`} scope="col">
              {c.summaryHours}
            </th>,
          ])}
        </tr>
      </thead>
      <tbody>
        {copy.monthNames.map((name, i) => (
          <tr key={name}>
            <th scope="row">{name}</th>
            {tables.map((t) => [
              <td key={`${t.year}-days`}>{t.rows[i]!.practiceDays}</td>,
              <td key={`${t.year}-hours`}>{num(t.rows[i]!.practiceDays * HOURS_PER_DAY, locale)}</td>,
            ])}
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <th scope="row">{c.total}</th>
          {tables.map((t) => [
            <td key={`${t.year}-days`}>{t.totals.practiceDays}</td>,
            <td key={`${t.year}-hours`}>{num(t.totals.practiceDays * HOURS_PER_DAY, locale)}</td>,
          ])}
        </tr>
      </tfoot>
    </ScrollTable>
  );
}

/** The year's public holidays and eves with date and weekday; one on a weekend is marked, since it frees no day. */
function Holidays({ year, copy, locale }: { year: number; copy: TableCopy; locale: Locale }) {
  const c = copy.columns;
  const bridges = bridgeDays(year);
  return (
    <>
      <section aria-labelledby={`holidays-${year}`}>
        <h2 className="h3" id={`holidays-${year}`}>
          {fill(c.holidaysTitle, { year })}
        </h2>
        <p>{c.holidaysIntro}</p>
        <ul className="holiday-list">
          {swedishHolidays(year).map((h) => (
            <li key={h.key}>
              <time dateTime={h.date}>{longDate(h.date, locale)}</time>
              <span className="holiday-name">{copy.holidays[h.key]}</span>
              <span className="holiday-tags">
                <span className={h.kind === 'eve' ? 'holiday-tag is-eve' : 'holiday-tag'}>
                  {h.kind === 'eve' ? c.kindEve : c.kindPublic}
                </span>
                {isWeekend(h.date) && <span className="holiday-tag is-muted">{c.onWeekend}</span>}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby={`bridges-${year}`}>
        <h2 className="h3" id={`bridges-${year}`}>
          {fill(c.bridgeTitle, { year })}
        </h2>
        {bridges.length > 0 ? (
          <>
            <p>{fill(c.bridgeIntro, { year })}</p>
            <ul>
              {bridges.map((date) => (
                <li key={date}>
                  <time dateTime={date}>{longDate(date, locale)}</time>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p>{fill(c.bridgeNone, { year })}</p>
        )}
      </section>
    </>
  );
}

/**
 * Working hours per month. The hub (`hours`) explains the rule over a summary of every year and links each year
 * page; a year page leads with its full table, then the year's holidays and bridge days. Every number is computed
 * from lib/workdays.ts at build time; the copy only names things.
 */
export function TablePage({ id, locale }: { id: TableId; locale: Locale }) {
  const copy = pageCopy(id, locale);
  const c = copy.columns;
  const year = id === 'hours' ? undefined : years[id];
  return (
    <PageShell id={id} locale={locale}>
      <article className="section pt-6">
        <div className="wrap">
          <div className="prose">
            <Breadcrumbs id={id} locale={locale} />
            <h1 className="h1">{copy.h1}</h1>
            {copy.lede.map((text) => (
              <p key={text} className="lead">
                <RichText text={text} locale={locale} />
              </p>
            ))}
          </div>
          <div className="table-slot">
            {year === undefined ? (
              <>
                <SummaryTable copy={copy} locale={locale} />
                <p className="table-note">{c.summaryNote}</p>
                <div className="table-links">
                  {(Object.keys(years) as YearId[]).map((yearId) => (
                    <a key={yearId} className="btn btn-ghost" href={hrefFor(yearId, locale)}>
                      {fill(c.yearLink, { year: years[yearId] })}
                    </a>
                  ))}
                </div>
              </>
            ) : (
              <>
                <YearTable year={year} copy={copy} locale={locale} />
                <p className="table-note">
                  {fill(c.tableNote, { legalHours: num(yearTotals(year).legalDays * HOURS_PER_DAY, locale) })}
                </p>
                <p className="table-note">{c.about}</p>
              </>
            )}
          </div>
          <div className="prose">
            {year !== undefined && <Holidays year={year} copy={copy} locale={locale} />}
            {copy.sections.map((section) => (
              <section key={section.h2}>
                <h2 className="h3">{section.h2}</h2>
                {section.body.map((text) => (
                  <p key={text}>
                    <RichText text={text} locale={locale} />
                  </p>
                ))}
                {section.list && (
                  <ul>
                    {section.list.map((text) => (
                      <li key={text}>
                        <RichText text={text} locale={locale} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </div>
      </article>
      {copy.faq.length > 0 && (
        <FaqList title={getDictionary(locale).faq.eyebrow} items={copy.faq} locale={locale} />
      )}
      <CtaBand cta={copy.cta} locale={locale}>
        <a className="btn btn-ghost" href={hrefFor('calculator', locale)}>
          {pageCopy('calculator', locale).breadcrumb}
        </a>
      </CtaBand>
    </PageShell>
  );
}
