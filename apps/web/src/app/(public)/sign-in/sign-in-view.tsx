'use client';

import { RailwayClock } from '@/components/clock';
import { Icon } from '@/components/icons';
import { BrandPanel } from '@/components/brand-panel';
import { LanguageToggle } from '@/components/language-toggle';
import { signInAction } from '@/lib/auth-actions';
import { useT } from '@/lib/i18n';

export function SignInView({ next, reauth }: { next: string; reauth: boolean }) {
  const t = useT();
  return (
    <div className="auth-wrap">
      <BrandPanel
        top={
          <div className="clock-wrap rise d1">
            <RailwayClock label={t('web.shell.clockLabel')} />
          </div>
        }
      >
        <h1 className="rise d1">
          {t('web.signIn.headlineA')}
          <br />
          <span className="accent">{t('web.signIn.headlineB')}</span>
        </h1>
        <p className="lead rise d2">{t('auth.oneAccount')}</p>
        <ul className="points rise d3">
          {(
            ['web.signIn.pointRoles', 'web.signIn.pointWorkspaces', 'web.signIn.pointPasswords'] as const
          ).map((key) => (
            <li key={key}>
              <Icon name="check" />
              {t(key)}
            </li>
          ))}
        </ul>
      </BrandPanel>
      <main className="auth" id="main">
        <div className="auth-inner">
          <div className="card auth-card rise">
            {reauth ? (
              <div className="banner bad" role="alert" style={{ marginBottom: 18 }}>
                <Icon name="alert" />
                <span>{t('errors.UNAUTHENTICATED')}</span>
              </div>
            ) : null}
            <h2>{t('auth.signInTitle')}</h2>
            <p className="sub">{t('auth.signInHint')}</p>
            <form action={signInAction}>
              <input type="hidden" name="next" value={next} />
              <input type="hidden" name="screen" value="signIn" />
              <button className="btn btn-primary btn-block mt" type="submit">
                {t('auth.continue')}
                <Icon name="arrow" />
              </button>
            </form>
            <form action={signInAction} className="after">
              <input type="hidden" name="next" value="/" />
              <input type="hidden" name="screen" value="register" />
              {t('auth.newHere')} <button type="submit">{t('auth.createWorkspace')}</button>
            </form>
            <div className="banner note">
              <Icon name="mail" />
              <span>{t('invitation.openLinkFirst')}</span>
            </div>
          </div>
          <div className="auth-foot">
            <span>{t('web.signIn.hosted')}</span>
            <LanguageToggle />
          </div>
        </div>
      </main>
    </div>
  );
}
