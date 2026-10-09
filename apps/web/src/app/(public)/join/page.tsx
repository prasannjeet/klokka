import { ResponseError, type Invitation } from '@klokka/api-client';
import { androidApkUrl } from '@/lib/env';
import { requestLocale } from '@/lib/server-prefs';
import { serverApi, signedInEmail, isSignedIn } from '@/lib/session';
import { JoinView, type JoinLookup } from './join-view';

// The invitation link from the email (docs/DECISIONS.md D3): /join?token=... The workspace card comes from
// the public lookup, so it shows before any sign-in.
export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token = typeof params.token === 'string' ? params.token.trim() : '';
  const [signedIn, accountEmail, lang] = await Promise.all([isSignedIn(), signedInEmail(), requestLocale()]);
  let lookup: JoinLookup;
  if (!token) {
    lookup = { kind: 'NOT_FOUND' };
  } else {
    try {
      const api = await serverApi({ authenticated: false });
      const invitation: Invitation = await api.invitations.getInvitation({ token, lang });
      lookup = { kind: 'FOUND', invitation };
    } catch (error) {
      // A malformed or unknown token is a link that does not work; an expired one says so.
      if (error instanceof ResponseError && error.response.status >= 400 && error.response.status < 500) {
        lookup = { kind: error.response.status === 410 ? 'EXPIRED' : 'NOT_FOUND' };
      } else {
        throw error;
      }
    }
  }
  return (
    <JoinView
      token={token}
      lookup={lookup}
      signedIn={signedIn}
      accountEmail={accountEmail}
      autoAccept={params.accept === '1'}
      apkUrl={androidApkUrl()}
    />
  );
}
