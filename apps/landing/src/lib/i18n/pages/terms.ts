import { contactEmail, licenseUrl } from '@/lib/links';
import { legalEntity } from './privacy';
import type { PageCopyBase, PageCopyOf } from './types';

// Fact check 2026-09-30 (CHQ-149): the processor section was checked against GDPR article 28(3) (IMY's Swedish full
// text): it now names the subject matter, duration, nature, purpose, data types and data subjects, and adds points f
// (help with articles 32 to 36), h (information and audits), the unlawful-instruction notice and 28(4) (same duties
// for sub-processors).
const mail = `[${contactEmail}](mailto:${contactEmail})` as const;

export const sv = {
  meta: {
    title: 'Användarvillkor | Klokka',
    description:
      'Villkoren för att använda Klokka: gratis att använda, godtagbar användning, arbetsgivarens ansvar och personuppgiftsbiträdesavtalet.',
    ogAlt: 'Klokka. Villkoren för att använda Klokka.',
  },
  card: { eyebrow: 'Villkor', title: 'Villkoren för att använda Klokka' },
  breadcrumb: 'Villkor',
  h1: 'Användarvillkor',
  lede: [
    'De här villkoren gäller när du använder Klokka på klokka.se, i webbappen och i Android-appen. Klokka är gratis att använda, och villkoren är korta med flit.',
  ],
  sections: [
    {
      h2: 'Tjänsten',
      body: [
        `Klokka är en app där arbetsgivaren för in timmarna varje anställd har jobbat och båda ser samma månad. ${legalEntity.sv.statement} När du skapar ett konto eller tackar ja till en inbjudan godkänner du villkoren.`,
      ],
    },
    {
      h2: 'Gratis och i befintligt skick',
      body: [
        'Klokka är gratis att använda i dag. Tjänsten tillhandahålls i befintligt skick, utan garantier för att den alltid är tillgänglig eller fri från fel. Exportera timmarna som CSV om du vill ha en egen kopia.',
      ],
    },
    {
      h2: 'Godtagbar användning',
      body: ['Vi får stänga av ett konto som bryter mot det här.'],
      list: [
        'Använd Klokka bara för lagliga ändamål.',
        'Missbruka inte tjänsten, till exempel genom att skicka skräppost med inbjudningar.',
        'Försök inte ta dig förbi inloggningen eller behörigheterna, komma åt andras uppgifter eller störa tjänsten.',
      ],
    },
    {
      h2: 'Arbetsgivarens ansvar',
      body: [
        'Som arbetsgivare ansvarar du för timmarna du för in, för att bjuda in rätt personer och för att du har stöd i lag eller avtal för att behandla de anställdas uppgifter i Klokka.',
      ],
    },
    {
      h2: 'Personuppgiftsbiträdesavtal',
      body: [
        'För uppgifterna en arbetsgivare för in om sina anställda är arbetsgivaren personuppgiftsansvarig och Klokka personuppgiftsbiträde. Behandlingen gäller de anställda som arbetsgivaren bjuder in: deras namn, e-postadress, timmar, anteckningar, flaggor och eventuell timlön. Den består i att lagra uppgifterna och visa dem för rätt personer, pågår så länge arbetsgivaren använder Klokka och har bara ett ändamål, att ge arbetsgivaren tjänsten. Det här avsnittet är avtalet om den behandlingen (artikel 28 i dataskyddsförordningen). Klokka:',
      ],
      list: [
        'behandlar uppgifterna bara enligt arbetsgivarens dokumenterade instruktioner, som är att ge tjänsten så som den fungerar i appen, och säger till direkt om en instruktion skulle strida mot dataskyddsreglerna,',
        'ser till att de som har tillgång till uppgifterna har tystnadsplikt,',
        'skyddar uppgifterna med lämpliga tekniska och organisatoriska åtgärder, bland annat krypterade anslutningar, åtskillnad mellan företag och säkerhetskopior,',
        'anlitar bara underbiträdena som står i [integritetspolicyn](page:privacy), ålägger dem samma skyldigheter som här och meddelar ändringar där innan de gäller, så att arbetsgivaren kan invända,',
        'hjälper arbetsgivaren att svara när en anställd vill ta del av, rätta eller radera sina uppgifter,',
        'hjälper arbetsgivaren med säkerheten, med personuppgiftsincidenter och med konsekvensbedömningar (artiklarna 32 till 36),',
        'raderar eller lämnar tillbaka uppgifterna när arbetsgivaren slutar använda tjänsten, efter arbetsgivarens val, och raderar kvarvarande kopior om inte lag kräver att de sparas,',
        'ger arbetsgivaren den information som behövs för att visa att det här avsnittet följs, och möjliggör granskningar.',
      ],
    },
    {
      h2: 'Koden är öppen',
      body: [
        `Källkoden till Klokka är licensierad under [MIT-licensen](${licenseUrl}). Licensen gäller koden, och de här villkoren gäller tjänsten vi driftar på klokka.se.`,
      ],
    },
    {
      h2: 'Lag och ändringar',
      body: [
        'Svensk lag gäller för villkoren.',
        'Ändras villkoren meddelar vi det på webbplatsen innan de gäller. Använder du Klokka efter det gäller de nya villkoren.',
        `Frågor om villkoren ställer du till ${mail}. Senast ändrade 30 september 2026.`,
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
    title: 'Terms of use | Klokka',
    description:
      "The terms for using Klokka: free to use, acceptable use, the employer's responsibility and the data processing agreement.",
    ogAlt: 'Klokka. The terms for using Klokka.',
  },
  card: { eyebrow: 'Terms', title: 'The terms for using Klokka' },
  breadcrumb: 'Terms',
  h1: 'Terms of use',
  lede: [
    'These terms apply when you use Klokka on klokka.se, in the web app and in the Android app. Klokka is free to use, and the terms are short on purpose.',
  ],
  sections: [
    {
      h2: 'The service',
      body: [
        `Klokka is an app where the employer logs the hours each employee worked and both see the same month. ${legalEntity.en.statement} By creating an account or accepting an invitation you accept these terms.`,
      ],
    },
    {
      h2: 'Free, and as is',
      body: [
        'Klokka is free to use today. The service is provided as is, without any warranty that it is always available or free of errors. Export the hours as CSV if you want a copy of your own.',
      ],
    },
    {
      h2: 'Acceptable use',
      body: ['We may suspend an account that breaks these rules.'],
      list: [
        'Use Klokka for lawful purposes only.',
        'Do not abuse the service, for example by sending spam through invitations.',
        "Do not try to get around sign-in or permissions, reach other people's data or disrupt the service.",
      ],
    },
    {
      h2: "The employer's responsibility",
      body: [
        "As an employer you are responsible for the hours you log, for inviting the right people, and for having a basis in law or contract to process your employees' data in Klokka.",
      ],
    },
    {
      h2: 'Data processing agreement',
      body: [
        'For the data an employer logs about their employees, the employer is the controller and Klokka is the processor. The processing concerns the employees the employer invites: their names, email addresses, hours, notes, flags and any hourly rate. It consists of storing the data and showing it to the right people, lasts as long as the employer uses Klokka and has one purpose only, to provide the service to the employer. This section is the agreement for that processing (Article 28 of the GDPR). Klokka:',
      ],
      list: [
        "processes the data only on the employer's documented instructions, which are to provide the service as it works in the app, and says so at once if an instruction would break data protection rules,",
        'makes sure everyone with access to the data is bound by confidentiality,',
        'protects the data with appropriate technical and organisational measures, including encrypted connections, separation between businesses and backups,',
        'uses only the sub-processors listed in the [privacy policy](page:privacy), holds them to the same obligations as here and announces changes there before they apply, so the employer can object,',
        'helps the employer respond when an employee asks to access, correct or delete their data,',
        'helps the employer with security, personal data breaches and impact assessments (Articles 32 to 36),',
        'deletes or returns the data, as the employer chooses, when the employer stops using the service, and deletes remaining copies unless the law requires them to be kept,',
        'gives the employer the information needed to show that this section is followed, and allows for audits.',
      ],
    },
    {
      h2: 'The code is open',
      body: [
        `Klokka’s source code is licensed under the [MIT licence](${licenseUrl}). The licence covers the code; these terms cover the service we run on klokka.se.`,
      ],
    },
    {
      h2: 'Law and changes',
      body: [
        'Swedish law applies to these terms.',
        'If the terms change, we announce it on the website before the change applies. Using Klokka after that means the new terms apply.',
        `Send questions about the terms to ${mail}. Last changed 30 September 2026.`,
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
