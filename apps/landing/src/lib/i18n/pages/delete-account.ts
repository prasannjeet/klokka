import { appUrl, contactEmail } from '@/lib/links';
import type { PageCopyBase, PageCopyOf } from './types';

// The page Google Play asks for (CHQ-157): how to delete an account without reinstalling the app, what goes and
// what stays. The rules are the API's (DELETE /me); keep this in step with docs/CONTRACT.md and the privacy page.
const mail = `[${contactEmail}](mailto:${contactEmail})` as const;
const app = `[${appUrl.replace(/^https?:\/\//, '')}](${appUrl})` as const;

export const sv = {
  meta: {
    title: 'Radera ditt konto | Klokka',
    description:
      'Så raderar du ditt Klokka-konto i appen eller på webben, vad som raderas och vad som finns kvar hos arbetsgivaren.',
    ogAlt: 'Klokka. Så raderar du ditt konto.',
  },
  card: { eyebrow: 'Radera konto', title: 'Så raderar du ditt Klokka-konto' },
  breadcrumb: 'Radera konto',
  h1: 'Radera ditt konto',
  lede: [
    'Du kan radera ditt Klokka-konto själv, i Android-appen eller i webbappen. Det tar en minut och går inte att ångra.',
  ],
  sections: [
    {
      h2: 'I appen',
      body: [
        'Öppna Inställningar (som arbetsgivare) eller Profil (som anställd) och tryck på Radera konto. Skriv RADERA och bekräfta. Du loggas ut direkt.',
      ],
    },
    {
      h2: 'På webben',
      body: [`Logga in på ${app}, öppna Profil och välj Radera konto. Skriv RADERA och bekräfta.`],
    },
    {
      h2: 'Vad som raderas',
      body: ['Allt detta raderas på en gång:'],
      list: [
        'ditt konto och din inloggning,',
        'ditt namn, din e-postadress och din avatar i Klokka, dina inställningar och dina notiser,',
        'företag som du äger, med alla anställdas timmar, jobb, flaggor och stängda månader.',
      ],
    },
    {
      h2: 'Vad som finns kvar',
      body: [
        'Har du varit anställd finns timmarna du har jobbat kvar hos arbetsgivaren under ditt namn, eftersom de är arbetsgivarens underlag. Din e-postadress och kopplingen till ditt konto tas bort från dem.',
        'Säkerhetskopiorna ersätts av nyare efter en tid, så raderade uppgifter försvinner också ur dem.',
      ],
    },
    {
      h2: 'Om du inte kommer åt kontot',
      body: [
        `Mejla ${mail} från adressen du loggar in med, så raderar vi kontot åt dig. Vi svarar utan onödigt dröjsmål och senast inom en månad.`,
      ],
    },
  ],
  faq: [],
  cta: {
    title: 'Timmarna, synliga för båda.',
    body: 'Skapa ett företag och bjud in de anställda. Gratis att använda, inget kort behövs.',
    button: 'Skapa ditt företag',
  },
} as const satisfies PageCopyBase;

export const en: PageCopyOf<typeof sv> = {
  meta: {
    title: 'Delete your account | Klokka',
    description:
      'How to delete your Klokka account in the app or on the web, what is deleted and what stays with your employer.',
    ogAlt: 'Klokka. How to delete your account.',
  },
  card: { eyebrow: 'Delete account', title: 'How to delete your Klokka account' },
  breadcrumb: 'Delete account',
  h1: 'Delete your account',
  lede: [
    'You can delete your Klokka account yourself, in the Android app or in the web app. It takes a minute and cannot be undone.',
  ],
  sections: [
    {
      h2: 'In the app',
      body: [
        'Open Settings (as an employer) or Profile (as an employee) and tap Delete account. Type DELETE and confirm. You are signed out at once.',
      ],
    },
    {
      h2: 'On the web',
      body: [`Sign in at ${app}, open Profile and choose Delete account. Type DELETE and confirm.`],
    },
    {
      h2: 'What is deleted',
      body: ['All of this is deleted at once:'],
      list: [
        'your account and your sign-in,',
        'your name, email address and avatar in Klokka, your settings and your notifications,',
        "businesses you own, with every employee's hours, jobs, flags and closed months.",
      ],
    },
    {
      h2: 'What stays',
      body: [
        "If you were an employee, the hours you worked stay with your employer under your name, because they are the employer's records. Your email address and the link to your account are removed from them.",
        'Backups are replaced by newer ones after a while, so deleted data also disappears from them.',
      ],
    },
    {
      h2: 'If you cannot get into the account',
      body: [
        `Email ${mail} from the address you sign in with and we will delete the account for you. We answer without undue delay and at the latest within one month.`,
      ],
    },
  ],
  faq: [],
  cta: {
    title: 'Hours in the open, for both sides.',
    body: 'Create a business and invite your employees. Free to use, no card needed.',
    button: 'Create your business',
  },
};
