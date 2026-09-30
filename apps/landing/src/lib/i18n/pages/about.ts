import { contactEmail, issuesUrl, licenseUrl, repoUrl } from '@/lib/links';
import type { PageCopyBase, PageCopyOf } from './types';

const mail = `[${contactEmail}](mailto:${contactEmail})` as const;
const securityUrl = `${repoUrl}/blob/main/SECURITY.md` as const;

export const sv = {
  meta: {
    title: 'Om Klokka: gratis tidrapportering med öppen källkod',
    description:
      'Klokka byggs i Sverige för arbetsgivare som betalar per timme. Gratis att använda, öppen källkod under MIT, på webben och Android.',
    ogAlt: 'Om Klokka. Byggd i Sverige, öppen för alla.',
  },
  card: { eyebrow: 'Om Klokka', title: 'Byggd i Sverige, öppen för alla' },
  breadcrumb: 'Om Klokka',
  h1: 'Om Klokka',
  lede: [
    'Klokka är en gratis app med öppen källkod (MIT) där arbetsgivaren för in timmarna varje anställd har jobbat och båda ser samma månad, utan gräns för antalet anställda. Klokka byggs i Sverige, fungerar på webben och i Android-appen och finns på svenska och engelska.',
  ],
  sections: [
    {
      h2: 'Vad Klokka gör',
      body: [
        'Klokka gör en sak: timmarna någon har jobbat, så att arbetsgivaren och den anställda är överens. Arbetsgivaren för in timmarna per dag, med en anteckning när det behövs. Den anställda ser sin dag, vecka och månad i mobilen, får en notis när något ändras och kan flagga en post som ser fel ut.',
        'Varje ändring sparas med vem och när. En månad kan låsas och exporteras som CSV till den som sköter lönen. Lön är ett val: slå på det så får varje anställd en timlön och ser beloppet bredvid timmarna.',
      ],
    },
    {
      h2: 'Vad Klokka inte är',
      body: [
        'Klokka är ingen stämpelklocka, inget schema och inget lönesystem. Klokka räknar inte ut OB eller övertid och ersätter inte en personalliggare. Det är med flit: en sak, gjord ordentligt.',
      ],
    },
    {
      h2: 'Namnet',
      body: [
        'Klokka betyder klockan på norska. En klocka som båda sidor tittar på, därav orden på startsidan: En klocka. För båda.',
      ],
    },
    {
      h2: 'Vem som bygger Klokka',
      body: [
        `Klokka byggs i Sverige som öppen källkod. Koden, ärendena och färdplanen finns öppet på [GitHub](${repoUrl}), och versionen vi driftar på klokka.se byggs från samma kod.`,
      ],
    },
    {
      h2: 'Öppen källkod och bidrag',
      body: [
        `Klokka är licensierad under [MIT-licensen](${licenseUrl}). Du får använda, ändra och köra koden, även åt andra.`,
      ],
      list: [
        `Hittar du ett fel eller saknar något? Skriv ett [ärende på GitHub](${issuesUrl}).`,
        'Vill du bidra med kod eller en översättning? Skicka en pull request.',
        `Säkerhetsproblem rapporteras enligt [SECURITY.md](${securityUrl}), inte i ett öppet ärende.`,
      ],
    },
    {
      h2: 'Kontakt',
      body: [
        `Mejla ${mail} om du har frågor om Klokka, om dina uppgifter eller om att radera ett konto. Hur vi hanterar personuppgifter står i [integritetspolicyn](page:privacy), och reglerna för tjänsten i [användarvillkoren](page:terms).`,
      ],
    },
  ],
  faq: [
    {
      q: 'Är Klokka gratis?',
      a: 'Ja. Klokka är gratis att använda och du behöver inget kort för att registrera dig. Koden är MIT-licensierad, så du kan också köra en egen kopia.',
    },
    {
      q: 'Finns det en gräns för antalet anställda?',
      a: 'Nej. Ett företag kan bjuda in så många anställda som det behöver.',
    },
    {
      q: 'Finns Klokka för iPhone?',
      a: 'Använd webbappen i webbläsaren, den har samma funktioner som Android-appen. Android-appen hämtas direkt från klokka.se.',
    },
  ],
  cta: {
    title: 'Skapa ett företag och för in timmar i dag.',
    body: 'Gratis att använda, inget kort behövs. Bjud in de anställda så ser ni samma månad.',
    button: 'Skapa ditt företag',
  },
} as const satisfies PageCopyBase;

export const en: PageCopyOf<typeof sv> = {
  meta: {
    title: 'About Klokka: free, open source hours tracking',
    description:
      'Klokka is built in Sweden for employers who pay by the hour. Free to use, open source under MIT, on the web and Android.',
    ogAlt: 'About Klokka. Built in Sweden, open to all.',
  },
  card: { eyebrow: 'About Klokka', title: 'Built in Sweden, open to all' },
  breadcrumb: 'About',
  h1: 'About Klokka',
  lede: [
    'Klokka is a free, open source (MIT) app where the employer logs the hours each employee worked and both see the same month, with no limit on the number of employees. It is built in Sweden, works on the web and in the Android app, and is available in English and Swedish.',
  ],
  sections: [
    {
      h2: 'What Klokka does',
      body: [
        'Klokka does one job: the hours a person worked, agreed by the employer and the employee. The employer logs the hours per day, with a note when it matters. The employee sees their day, week and month on their phone, is notified when something changes, and can flag an entry that looks wrong.',
        'Every change is kept with who and when. A month can be locked and exported as CSV for whoever runs the pay. Pay is optional: turn it on and every employee gets an hourly rate and sees the amount next to the hours.',
      ],
    },
    {
      h2: 'What Klokka is not',
      body: [
        'Klokka is not a time clock, a scheduling tool or a payroll system. It does not calculate unsocial hours or overtime, and it does not replace a Swedish staff register (personalliggare). That is on purpose: one job, done properly.',
      ],
    },
    {
      h2: 'The name',
      body: [
        'Klokka is Norwegian for the clock. One clock that both sides look at, hence the words on the front page: One clock. Both sides.',
      ],
    },
    {
      h2: 'Who builds Klokka',
      body: [
        `Klokka is built in Sweden as open source. The code, the issues and the roadmap are in the open on [GitHub](${repoUrl}), and the version we run on klokka.se is built from the same code.`,
      ],
    },
    {
      h2: 'Open source and contributing',
      body: [
        `Klokka is licensed under the [MIT licence](${licenseUrl}). You may use, change and run the code, for others too.`,
      ],
      list: [
        `Found a bug or missing something? Open an [issue on GitHub](${issuesUrl}).`,
        'Want to contribute code or a translation? Send a pull request.',
        `Report security problems as described in [SECURITY.md](${securityUrl}), not in a public issue.`,
      ],
    },
    {
      h2: 'Contact',
      body: [
        `Email ${mail} with questions about Klokka, about your data or about deleting an account. How we handle personal data is in the [privacy policy](page:privacy), and the rules of the service are in the [terms of use](page:terms).`,
      ],
    },
  ],
  faq: [
    {
      q: 'Is Klokka free?',
      a: 'Yes. Klokka is free to use and you need no card to sign up. The code is MIT licensed, so you can also run your own copy.',
    },
    {
      q: 'Is there a limit on the number of employees?',
      a: 'No. A business can invite as many employees as it needs.',
    },
    {
      q: 'Is there an iPhone app?',
      a: 'Use the web app in the browser; it has the same features as the Android app. The Android app is downloaded straight from klokka.se.',
    },
  ],
  cta: {
    title: 'Create a business and log hours today.',
    body: 'Free to use, no card needed. Invite your employees and you both see the same month.',
    button: 'Create your business',
  },
};
