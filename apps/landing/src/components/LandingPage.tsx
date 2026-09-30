import { Hero } from '@/components/hero/Hero';
import { Ticker } from '@/components/hero/Ticker';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteNav } from '@/components/layout/SiteNav';
import { PayScope } from '@/components/pay/PayScope';
import { Cta } from '@/components/sections/Cta';
import { Employees } from '@/components/sections/Employees';
import { Employers } from '@/components/sections/Employers';
import { Faq } from '@/components/sections/Faq';
import { HowItWorks } from '@/components/sections/HowItWorks';
import { Insights } from '@/components/sections/Insights';
import { OpenSource } from '@/components/sections/OpenSource';
import { Pay } from '@/components/sections/Pay';
import { InViewObserver } from '@/components/ui/InViewObserver';
import { getDictionary, type Locale } from '@/lib/i18n';

/** The page, section by section as in docs/design/mockups/landing.html. */
export function LandingPage({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  return (
    <>
      <header className="hero" id="top">
        <SiteNav t={t} locale={locale} page="home" />
        <Hero t={t} locale={locale} />
        <Ticker t={t} />
      </header>
      <main id="main">
        <HowItWorks t={t} locale={locale} />
        <Employers t={t} locale={locale} />
        <Employees t={t} />
        <PayScope>
          <Pay t={t} locale={locale} />
          <Insights t={t} locale={locale} />
        </PayScope>
        <OpenSource t={t} />
        <Faq t={t} />
        <Cta t={t} />
      </main>
      <SiteFooter t={t} locale={locale} page="home" />
      <InViewObserver />
    </>
  );
}
