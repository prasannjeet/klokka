'use client';

// Accepting an invitation (CHQ-114, mockup login.html "Invited"): the workspace tile first, then one action.
// Not signed in: Join opens Logto's sign-up with the invited email filled in (or sign in with an existing
// account) and comes back here with accept=1. Signed in: accept right away. Afterwards: get the Android app
// or continue on the web. Signed in as another account (CHQ-178): no Join, only a sign-out that comes back
// here, so the invited address can sign in.
import Link from 'next/link';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { Invitation, InvitationAccepted } from '@klokka/api-client';
import { BrandPanel } from '@/components/brand-panel';
import { Icon } from '@/components/icons';
import { LanguageToggle } from '@/components/language-toggle';
import { api } from '@/lib/api';
import { signInAction, signOutAction } from '@/lib/auth-actions';
import { useT } from '@/lib/i18n';
import { problemMessage, toProblem, type ProblemInfo } from '@/lib/problem';
import { colourVar } from '@/lib/visual';

export type JoinLookup =
  { kind: 'FOUND'; invitation: Invitation } | { kind: 'NOT_FOUND' } | { kind: 'EXPIRED' };

export function JoinView({
  token,
  lookup,
  signedIn,
  accountEmail,
  autoAccept,
  apkUrl,
}: {
  token: string;
  lookup: JoinLookup;
  signedIn: boolean;
  accountEmail: string | null;
  autoAccept: boolean;
  apkUrl: string | null;
}) {
  const t = useT();
  const invitation = lookup.kind === 'FOUND' ? lookup.invitation : null;
  const [joined, setJoined] = useState<{ accepted: InvitationAccepted; href: string } | null>(null);
  const [problem, setProblem] = useState<ProblemInfo | null>(null);
  const started = useRef(false);
  const returnTo = `/join?token=${encodeURIComponent(token)}&accept=1`;

  const accept = useMutation({
    mutationFn: async () => {
      const accepted = await api.invitations.acceptInvitation({ token });
      return { accepted, href: `/w/${accepted.workspaceSlug}` };
    },
    onSuccess: (result) => setJoined(result),
    onError: async (error) => setProblem(await toProblem(error)),
  });

  const pending = invitation?.status === 'PENDING';
  const otherAccount =
    signedIn &&
    !!accountEmail &&
    !!invitation &&
    accountEmail.toLowerCase() !== invitation.email.toLowerCase();
  useEffect(() => {
    if (autoAccept && signedIn && !otherAccount && pending && !started.current) {
      started.current = true;
      accept.mutate();
    }
  }, [autoAccept, signedIn, otherAccount, pending, accept]);

  const tileStyle = invitation
    ? ({ '--ws-color': colourVar(invitation.workspaceColour) } as CSSProperties)
    : {};

  return (
    <div className="auth-wrap">
      <BrandPanel>
        {invitation ? (
          <>
            <div className="ws-tile rise d1" style={tileStyle}>
              <span className="em" aria-hidden="true">
                {invitation.workspaceEmoji}
              </span>
              <div>
                <b>{invitation.workspaceName}</b>
                <span>{t('web.join.inviterLine', { name: invitation.inviterName })}</span>
                <br />
                <span className="role">{t('role.youJoinAsEmployee')}</span>
              </div>
            </div>
            <h1 className="rise d2">
              {t('web.join.headlineA', { name: invitation.inviterName })}{' '}
              <span className="accent">
                {t('web.join.headlineB', { workspace: invitation.workspaceName })}
              </span>
            </h1>
            <p className="lead rise d3">
              {t('invitation.logsYourHoursHint', { workspace: invitation.workspaceName })}
            </p>
          </>
        ) : (
          <h1 className="rise d1">
            {t('web.signIn.headlineA')}
            <br />
            <span className="accent">{t('web.signIn.headlineB')}</span>
          </h1>
        )}
      </BrandPanel>
      <main className="auth" id="main">
        <div className="auth-inner">
          <div className="card auth-card rise" aria-live="polite">
            {joined ? (
              <Joined joined={joined} employer={invitation?.inviterName ?? ''} apkUrl={apkUrl} />
            ) : lookup.kind !== 'FOUND' || !invitation ? (
              <Unusable
                text={lookup.kind === 'EXPIRED' ? t('errors.INVITATION_EXPIRED') : t('web.join.notFound')}
              />
            ) : invitation.status === 'EXPIRED' ? (
              <Unusable text={t('invitation.expired', { name: invitation.inviterName })} />
            ) : invitation.status === 'REVOKED' ? (
              <Unusable text={t('web.join.revoked', { name: invitation.inviterName })} />
            ) : invitation.status === 'ACCEPTED' ? (
              <Unusable text={t('web.join.alreadyAccepted')} continueHref="/" />
            ) : (
              <>
                <div className="steps">
                  <span>{t('invitation.acceptTitle')}</span>
                  <i className="on" />
                </div>
                <h2>{t('invitation.youHaveBeenInvited', { workspace: invitation.workspaceName })}</h2>
                <p className="sub">{t('invitation.addedYou', { name: invitation.inviterName })}</p>
                {problem ? (
                  <div className="banner bad" role="alert" style={{ marginTop: 16 }}>
                    <Icon name="alert" />
                    <span>
                      {problem.code === 'INVITATION_EMAIL_MISMATCH'
                        ? t('invitation.wrongAccount', { email: invitation.email })
                        : problemMessage(t, problem)}
                    </span>
                  </div>
                ) : null}
                <div className="field">
                  <label htmlFor="join-email">{t('invitation.emailFromInvitation')}</label>
                  <input className="input" id="join-email" type="email" value={invitation.email} readOnly />
                </div>
                {otherAccount ? (
                  <>
                    <div className="banner bad" role="alert" style={{ marginTop: 16 }}>
                      <Icon name="alert" />
                      <span>
                        {t('invitation.signedInAsOther', { current: accountEmail, email: invitation.email })}
                      </span>
                    </div>
                    <form action={signOutAction}>
                      <input type="hidden" name="next" value={`/join?token=${encodeURIComponent(token)}`} />
                      <button className="btn btn-primary btn-block mt" type="submit">
                        {t('invitation.signOutToAccept')}
                      </button>
                    </form>
                  </>
                ) : signedIn ? (
                  <>
                    <button
                      className="btn btn-primary btn-block mt"
                      type="button"
                      disabled={accept.isPending}
                      onClick={() => {
                        setProblem(null);
                        accept.mutate();
                      }}
                    >
                      {accept.isPending
                        ? t('common.loading')
                        : t('invitation.join', { workspace: invitation.workspaceName })}
                      <Icon name="arrow" />
                    </button>
                    {problem?.code === 'INVITATION_EMAIL_MISMATCH' ? (
                      <form action={signInAction} className="after">
                        <input type="hidden" name="next" value={returnTo} />
                        <input type="hidden" name="screen" value="signIn" />
                        <input type="hidden" name="email" value={invitation.email} />
                        <input type="hidden" name="prompt" value="login" />
                        <button type="submit">
                          {t('web.join.otherAccount', { email: invitation.email })}
                        </button>
                      </form>
                    ) : (
                      <p className="legal">{t('web.join.signedIn')}</p>
                    )}
                  </>
                ) : (
                  <>
                    <form action={signInAction}>
                      <input type="hidden" name="next" value={returnTo} />
                      <input type="hidden" name="screen" value="register" />
                      <input type="hidden" name="email" value={invitation.email} />
                      <button className="btn btn-primary btn-block mt" type="submit">
                        {t('invitation.join', { workspace: invitation.workspaceName })}
                        <Icon name="arrow" />
                      </button>
                    </form>
                    <p className="legal">
                      {t('invitation.privacyHint', { employer: invitation.inviterName })}
                    </p>
                    <form action={signInAction} className="after">
                      <input type="hidden" name="next" value={returnTo} />
                      <input type="hidden" name="screen" value="signIn" />
                      <input type="hidden" name="email" value={invitation.email} />
                      {t('invitation.alreadyHaveAccount')}{' '}
                      <button type="submit">{t('invitation.signInToAccept')}</button>
                    </form>
                    <div className="banner note">
                      <Icon name="mail" />
                      <span>{t('web.join.hosted')}</span>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
          <div className="auth-foot">
            <LanguageToggle />
          </div>
        </div>
      </main>
    </div>
  );
}

function Joined({
  joined,
  employer,
  apkUrl,
}: {
  joined: { accepted: InvitationAccepted; href: string };
  employer: string;
  apkUrl: string | null;
}) {
  const t = useT();
  return (
    <>
      <div className="steps">
        <span>{t('invitation.acceptTitle')}</span>
        <i className="on" />
      </div>
      <h2>{t('invitation.accepted', { workspace: joined.accepted.workspaceName })}</h2>
      <p className="sub">{t('web.join.acceptedBody', { employer })}</p>
      {apkUrl ? (
        <>
          <a className="btn btn-primary btn-block mt" href={apkUrl} download>
            <Icon name="smartphone" />
            {t('nav.getAndroidApp')}
          </a>
          <p className="legal">{t('web.join.appHint')}</p>
        </>
      ) : null}
      <Link
        className={apkUrl ? 'btn btn-ghost btn-block mt' : 'btn btn-primary btn-block mt'}
        href={joined.href}
      >
        {t('invitation.continueOnWeb')}
        <Icon name="arrow" />
      </Link>
    </>
  );
}

function Unusable({ text, continueHref }: { text: string; continueHref?: string }) {
  const t = useT();
  return (
    <>
      <h2>{t('invitation.title')}</h2>
      <div className="banner" style={{ marginTop: 16 }}>
        <Icon name="info" />
        <span>{text}</span>
      </div>
      <Link className="btn btn-secondary btn-block mt" href={continueHref ?? '/sign-in'}>
        {continueHref ? t('invitation.continueOnWeb') : t('web.join.toSignIn')}
      </Link>
    </>
  );
}
