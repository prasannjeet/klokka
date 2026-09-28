import { ApkLink } from '@/components/ui/ApkLink';
import type { Dictionary } from '@/lib/i18n';
import { appUrl } from '@/lib/links';

export function Cta({ t }: { t: Dictionary }) {
  const c = t.cta;
  return (
    <section className="section pt-0" id="start" aria-label={c.startEyebrow}>
      <div className="wrap cta-band">
        <div className="cta-dark reveal on-color">
          <p className="eyebrow">{c.startEyebrow}</p>
          <h2 className="h2">{c.startTitle}</h2>
          <p className="lead">{c.startLead}</p>
          <div className="cta-actions">
            <a className="btn btn-primary" href={appUrl}>
              {c.create}
            </a>
            <a className="btn btn-ghost" href={appUrl}>
              {c.login}
            </a>
          </div>
        </div>
        <div className="cta-light reveal on-color">
          <div>
            <p className="eyebrow">{c.invitedEyebrow}</p>
            <h2 className="h2">{c.invitedTitle}</h2>
            <p className="lead mt-4">{c.invitedLead}</p>
          </div>
          <ApkLink t={t} variant="on-primary" />
        </div>
      </div>
    </section>
  );
}
