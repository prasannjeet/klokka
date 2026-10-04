import { contactEmail } from '@/lib/links';
import type { PageCopyBase, PageCopyOf } from './types';

/**
 * Who runs the hosted service: the controller's identity in the privacy policy (GDPR Art. 13) and the provider in
 * the terms (the owner's wording, plan gate 3). Shown on those two pages only; the about page names no person.
 */
export const legalEntity = {
  sv: {
    name: 'Prasannjeet Singh (enskild firma)',
    statement:
      'Klokka drivs av Prasannjeet Singh (enskild firma), organisationsnummer 891010-6973, Väderkvarnsbacken 163, 352 56 Växjö.',
  },
  en: {
    name: 'Prasannjeet Singh (sole trader)',
    statement:
      'Klokka is run by Prasannjeet Singh (sole trader, enskild firma), organisation number 891010-6973, Väderkvarnsbacken 163, 352 56 Växjö, Sweden.',
  },
} as const;

// Fact check 2026-09-30 (CHQ-149): GDPR article 12(3) (one month, IMY's Swedish full text), IMY as the Swedish
// supervisory authority (imy.se, article 77), Switzerland's adequacy and the EU-US DPF (European Commission adequacy
// page), Expo's and Google's DPF self-certification (their privacy pages). The employee-hours legal basis no longer
// cites a general duty to record working time, which Swedish law does not have (arbetstidslagen 11 §).
const mail = `[${contactEmail}](mailto:${contactEmail})` as const;

export const sv = {
  meta: {
    title: 'Integritetspolicy | Klokka',
    description:
      'Vilka personuppgifter Klokka behandlar, varför, var de lagras, hur länge och hur du tar del av, exporterar eller raderar dem.',
    ogAlt: 'Klokka. Så hanterar Klokka dina uppgifter.',
  },
  card: { eyebrow: 'Integritet', title: 'Så hanterar Klokka dina uppgifter' },
  breadcrumb: 'Integritet',
  h1: 'Integritetspolicy',
  lede: [
    'Klokka lagrar de timmar en arbetsgivare för in för sina anställda och de uppgifter som behövs för att visa dem för rätt personer. Inga lösenord lagras i Klokkas databas, och webbplatsen har ingen spårning eller analys.',
    'Här står vilka uppgifter det är, varför de behandlas, var de lagras, hur länge de sparas och hur du tar del av, exporterar eller raderar dem.',
  ],
  sections: [
    {
      h2: 'Vem som ansvarar',
      body: [
        `${legalEntity.sv.statement} Klokka har två roller. För ditt konto, alltså namn, e-postadress och inställningar, är ${legalEntity.sv.name} personuppgiftsansvarig.`,
        'För timmarna som en arbetsgivare för in om sina anställda är arbetsgivaren personuppgiftsansvarig och Klokka personuppgiftsbiträde. Vi behandlar de uppgifterna bara för att ge arbetsgivaren tjänsten, enligt personuppgiftsbiträdesavtalet i [villkoren](page:terms).',
        `Frågor om dina uppgifter ställer du till ${mail}. Mer om vilka vi är står på sidan [om Klokka](page:about).`,
      ],
    },
    {
      h2: 'Vilka uppgifter vi lagrar',
      body: ['Det här är allt Klokka sparar:'],
      list: [
        'Konto: namn, e-postadress, språk, ljust eller mörkt läge och inställningar för notiser. Inloggningen sköts av Klokkas egen inloggningstjänst (Logto), där lösenordet sparas hashat. Klokkas databas har inga lösenord.',
        'Företaget: namn, valuta, tidszon och inställningar.',
        'Timmar: antal timmar per dag och anställd, anteckningar, flaggor med meddelanden, låsta månader och historiken över varje ändring (vem, vad och när).',
        'Timlön, om arbetsgivaren har slagit på lön och angett en timlön för den anställda.',
        'Notiser: en token för pushnotiser till varje telefon där du är inloggad i Android-appen.',
        'E-post: adresser för inbjudningar och för veckosammanfattningar som du själv har valt att få.',
      ],
    },
    {
      h2: 'Varför uppgifterna behandlas',
      body: [
        'Kontouppgifterna behandlas för att ge dig tjänsten du har registrerat dig för (avtal). Säkerhet och drift, som loggar och säkerhetskopior, vilar på berättigat intresse.',
        'Timmarna om anställda behandlas på arbetsgivarens uppdrag. Den rättsliga grunden för dem är arbetsgivarens, till exempel anställningsavtalet eller skyldigheten att föra anteckningar om jourtid, övertid och mertid enligt arbetstidslagen.',
      ],
    },
    {
      h2: 'Var uppgifterna lagras',
      body: [
        'Allt lagras på servrar hos NetCup i Tyskland, inom EU, och säkerhetskopiorna på vår egen server i Sverige. Inloggningen körs på samma servrar i vår egen installation av Logto, inte hos en extern inloggningstjänst.',
        'Två tjänster finns utanför EU och EES. E-posten skickas via Migadu, ett företag i Schweiz, och Schweiz har enligt EU-kommissionen en adekvat skyddsnivå för personuppgifter. Pushnotiserna levereras via Expo och Google Firebase Cloud Messaging i USA, med stöd av EU-US Data Privacy Framework, som båda företagen är certifierade enligt, och EU-kommissionens standardavtalsklausuler. En pushnotis innehåller bara notisens text och telefonens token.',
      ],
    },
    {
      h2: 'Vilka andra som behandlar uppgifter',
      body: [
        'Klokka använder några få underbiträden, och bara för det som står här. Ändras listan meddelar vi det på den här sidan innan ändringen gäller.',
      ],
      list: [
        'NetCup (Tyskland): servrar och databas.',
        'Migadu (Schweiz): utskick av e-post, som inbjudningar och veckosammanfattningar.',
        'Expo (USA) och Google Firebase Cloud Messaging (USA): leverans av pushnotiser till Android-appen. De får bara notisens text och telefonens token.',
      ],
    },
    {
      h2: 'Kakor och lagring i webbläsaren',
      body: [
        'Webbplatsen klokka.se har ingen analys, ingen spårning och inga spårningskakor. Den sparar bara ditt val av ljust eller mörkt läge i webbläsaren.',
        'Webbappen använder en kaka för inloggningen och några kakor för dina val: språk, ljust eller mörkt läge och senast valda företag. De behövs för att appen ska fungera.',
      ],
    },
    {
      h2: 'Hur länge uppgifterna sparas',
      body: [
        'Uppgifterna sparas så länge kontot eller företaget finns. Det finns ingen automatisk radering.',
        'Databasen säkerhetskopieras varje dag till vår egen server i Sverige, över en krypterad förbindelse. Säkerhetskopiorna sparas en begränsad tid och ersätts sedan av nyare, så uppgifter som har raderats försvinner också ur dem efter en tid.',
        `Du kan radera ditt konto själv i appen eller på webben, se [Radera ditt konto](page:delete-account). Kommer du inte åt kontot, mejla ${mail} så raderar vi det åt dig. Vi svarar utan onödigt dröjsmål och senast inom en månad.`,
      ],
    },
    {
      h2: 'Dina rättigheter',
      body: [
        'Du har rätt att få veta vilka uppgifter vi har om dig, att få dem rättade eller raderade, att begränsa eller invända mot behandlingen och att få ut dem i ett läsbart format. Arbetsgivaren kan exportera timmarna för vilken månad som helst som en CSV-fil.',
        'Är du anställd och gäller det timmarna din arbetsgivare har fört in? Vänd dig först till din arbetsgivare, som ansvarar för de uppgifterna. Arbetsgivaren kan i sin tur be oss om hjälp.',
        'Tycker du att vi hanterar dina uppgifter fel kan du klaga hos [Integritetsskyddsmyndigheten (IMY)](https://www.imy.se).',
      ],
    },
    {
      h2: 'Ändringar',
      body: [
        'Ändras policyn uppdaterar vi den här sidan och datumet nedan. Större ändringar meddelar vi på webbplatsen innan de gäller.',
        'Senast ändrad 4 oktober 2026.',
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
    title: 'Privacy policy | Klokka',
    description:
      'What personal data Klokka processes, why, where it is stored, for how long, and how to access, export or delete it.',
    ogAlt: 'Klokka. How Klokka handles your data.',
  },
  card: { eyebrow: 'Privacy', title: 'How Klokka handles your data' },
  breadcrumb: 'Privacy',
  h1: 'Privacy policy',
  lede: [
    "Klokka stores the hours an employer logs for their employees, and the details needed to show them to the right people. No passwords are stored in Klokka's database, and this website has no tracking or analytics.",
    'This page lists that data, why it is processed, where it is stored, how long it is kept, and how to access, export or delete it.',
  ],
  sections: [
    {
      h2: 'Who is responsible',
      body: [
        `${legalEntity.en.statement} Klokka has two roles. For your account, meaning your name, email address and settings, the controller is ${legalEntity.en.name}.`,
        'For the hours an employer logs about their employees, the employer is the controller and Klokka is the processor. We process that data only to provide the service to the employer, under the data processing clause in the [terms](page:terms).',
        `Send questions about your data to ${mail}. Who we are is on the [about page](page:about).`,
      ],
    },
    {
      h2: 'What we store',
      body: ['This is everything Klokka keeps:'],
      list: [
        "Account: name, email address, language, light or dark mode and notification settings. Sign-in is handled by Klokka's own sign-in service (Logto), which stores your password hashed. Klokka's database holds no passwords.",
        'Business: name, currency, time zone and settings.',
        'Hours: hours per day per employee, notes, flags with their messages, locked months and the history of every change (who, what and when).',
        'Hourly rate, if the employer has turned pay on and set a rate for the employee.',
        'Notifications: a push notification token for each phone where you are signed in to the Android app.',
        'Email: addresses for invitations and for weekly digests you chose to receive.',
      ],
    },
    {
      h2: 'Why the data is processed',
      body: [
        'Account data is processed to provide the service you signed up for (contract). Security and operations, such as logs and backups, rest on legitimate interest.',
        "Employees' hours are processed on the employer's behalf. The legal basis for them is the employer's, for example the employment contract or the duty under the Working Hours Act to record on-call time, overtime and additional hours.",
      ],
    },
    {
      h2: 'Where the data is stored',
      body: [
        'Everything is stored on servers at NetCup in Germany, inside the EU, and backups on our own server in Sweden. Sign-in runs on the same servers, in our own installation of Logto, not with an outside sign-in provider.',
        "Two services sit outside the EU and EEA. Email is sent through Migadu, a company in Switzerland, which the European Commission recognises as giving adequate protection to personal data. Push notifications are delivered through Expo and Google Firebase Cloud Messaging in the US, relying on the EU-US Data Privacy Framework, under which both companies are certified, and on the European Commission's standard contractual clauses. A push notification contains only the notification text and the phone's token.",
      ],
    },
    {
      h2: 'Who else processes data',
      body: [
        'Klokka uses a few sub-processors, only for what is listed here. If the list changes, we say so on this page before the change applies.',
      ],
      list: [
        'NetCup (Germany): servers and database.',
        'Migadu (Switzerland): sending email, such as invitations and weekly digests.',
        "Expo (US) and Google Firebase Cloud Messaging (US): delivering push notifications to the Android app. They receive only the notification text and the phone's token.",
      ],
    },
    {
      h2: 'Cookies and browser storage',
      body: [
        'The klokka.se website has no analytics, no tracking and no tracking cookies. It only stores your choice of light or dark mode in your browser.',
        'The web app uses one cookie for sign-in and a few for your choices: language, light or dark mode and the business you last opened. They are needed for the app to work.',
      ],
    },
    {
      h2: 'How long data is kept',
      body: [
        'Data is kept for as long as the account or the business exists. Nothing is deleted automatically.',
        'The database is backed up every day to our own server in Sweden, over an encrypted connection. Backups are kept for a limited period and then replaced by newer ones, so deleted data also disappears from them after a while.',
        `You can delete your account yourself in the app or on the web, see [Delete your account](page:delete-account). If you cannot get into the account, email ${mail} and we will delete it for you. We answer without undue delay and at the latest within one month.`,
      ],
    },
    {
      h2: 'Your rights',
      body: [
        'You have the right to know what data we hold about you, to have it corrected or deleted, to restrict or object to its processing, and to get it in a readable format. An employer can export the hours of any month as a CSV file.',
        'Are you an employee asking about hours your employer logged? Ask your employer first, as they are responsible for that data. The employer can then ask us for help.',
        'If you think we handle your data wrongly, you can complain to the Swedish data protection authority, [IMY](https://www.imy.se).',
      ],
    },
    {
      h2: 'Changes',
      body: [
        'If this policy changes, we update this page and the date below. Larger changes are announced on the website before they apply.',
        'Last changed 4 October 2026.',
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
