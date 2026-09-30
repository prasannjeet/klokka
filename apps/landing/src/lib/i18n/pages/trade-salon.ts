import type { IndustryCopy, PageCopyOf } from './types';

// Personalliggare: docs/research/seo/gapfill.md 2a. Hair care is an example under kropps- och skönhetsvård (no
// separate frisör branch); the activity decides, not the SNI code; the family exemption; the ledger's content and the
// kontrollavgift (12 500 kr plus 2 500 kr per person not recorded). No collective agreement is named, and nothing is
// said about chair renters: neither was verified.
const skvBeauty =
  'https://www.skatteverket.se/foretag/arbetsgivare/personalliggare/personalliggarekroppsochskonhetsvard.4.2cf1b5cd163796a5c8bb517.html';

export const sv = {
  meta: {
    title: 'Tidrapportering för frisör och salong | Klokka',
    description:
      'Logga timmarna för salongens personal och låt dem se sin månad i appen. Fel flaggas direkt. Gratis att använda och öppen källkod.',
    ogAlt: 'Tidrapportering för frisör och salong: salongens timmar i appen.',
  },
  card: { eyebrow: 'Frisör och salong', title: 'Salongens timmar i appen' },
  breadcrumb: 'Frisör och salong',
  h1: 'Tidrapportering för frisör och salong',
  lede: [
    'Klokka är tidrapportering för frisörer och salonger: du loggar personalens timmar per dag, och var och en ser sin månad i mobilen och kan flagga en rad som är fel. Klokka är gratis att använda, har öppen källkod (MIT), ingen gräns för antalet anställda och fungerar på webben och i Android-appen, på svenska och engelska.',
  ],
  notice: `Klokka ersätter inte en personalliggare. Frisörer och andra salonger inom kropps- och skönhetsvård omfattas av kravet på personalliggare enligt Skatteverket, och den förs vid sidan av tidrapporten. Läs mer i [personalliggare eller tidrapport](page:guide-personalliggare) och hos [Skatteverket](${skvBeauty}).`,
  week: {
    title: 'Salong Sax',
    subtitle: 'Vecka 39, 21–27 september',
    label: 'Exempel: veckan på Salong Sax, fyra anställda',
    caption: 'Påhittad salong, påhittade siffror. Öppet tisdag till lördag, och lördagen är lång.',
  },
  sections: [
    {
      h2: 'Så ser en vecka ut på en salong',
      body: [
        'Salong Sax har öppet tisdag till lördag, så måndagen står som ledig för alla. Hanna jobbar heltid och tar varje lördag. Sofia jobbar deltid, tre dagar och lördagen. Leila jobbar onsdag till lördag, och Amir är lärling och jobbar tisdag till fredag.',
        'Du för in dagen när salongen har stängt, eller hela veckan på en gång i rutnätet ovan. Samma som i går fyller i dagarna som ser likadana ut. Går någon på kurs en halvdag skriver du det i anteckningen till dagens timmar, så att det syns varför dagen blev kortare.',
      ],
    },
    {
      h2: 'Mellan två kunder hinner ingen fylla i en tidrapport',
      body: [
        'På en salong står personalen vid stolen hela dagen. I Klokka behöver de inte fylla i något: du för in timmarna, de ser dem i mobilen och får en notis när något läggs till, ändras eller tas bort. Är en rad fel flaggar de den direkt, och historiken sparar vem som ändrade vad.',
      ],
    },
    {
      h2: 'Timmar, inte provision',
      body: [
        'Klokka räknar timmar. Provision på behandlingar eller försäljning räknas inte, och inte heller OB eller övertid. Med lön påslaget ser var och en timmar gånger timlön, och resten sköts i lönesystemet utifrån ert kollektivavtal.',
      ],
    },
    {
      h2: 'Deltid och lärlingar',
      body: [
        'Bjud in var och en med namn och e-post. Det finns ingen gräns för antalet anställda, så en lärling eller en extra frisör inför julen läggs till på en minut. Många i branschen jobbar deltid eller per timme, läs mer om [tidrapport för timanställda](page:hourly).',
      ],
    },
    {
      h2: 'Salongen och personalliggaren',
      body: [
        'Kropps- och skönhetsvård är en av de sex branscher som ska föra personalliggare 2026. Skatteverket räknar till exempel hårvård, manikyr och pedikyr, massage och tatuering dit, och det är vad verksamheten faktiskt gör som avgör, inte vilken branschkod företaget har. Undantag finns, bland annat när bara ägaren och den närmaste familjen arbetar i salongen.',
        'Personalliggaren ska visa namn och personnummer på alla som arbetar och när varje pass börjar och slutar, antecknat när det händer. Vid ett kontrollbesök är det liggaren Skatteverket vill se. Saknas en person i den kan det bli en kontrollavgift på 12 500 kronor plus 2 500 kronor för varje person som inte är antecknad.',
        'Klokka för in timmarna i efterhand och sparar inga personnummer, så Klokka ersätter inte en personalliggare. Tidrapporten är underlaget för lönen, och personalliggaren förs vid sidan av. Mer i [personalliggare eller tidrapport](page:guide-personalliggare).',
      ],
    },
    {
      h2: 'Månadsslut',
      body: [
        'När månaden stämmer låser du den och exporterar en CSV-fil till den som sköter lönen. Börjar du hellre på papper finns en [tidrapport mall](page:template) att skriva ut.',
      ],
    },
    {
      h2: 'Vad Klokka inte gör',
      body: [
        'Klokka bokar inga kunder, gör inga scheman, har ingen stämpelklocka och räknar ingen provision eller lön. Klokka är inte en personalliggare. Se hur det ser ut i [appen](page:app).',
      ],
    },
  ],
  faq: [
    {
      q: 'Behöver en frisörsalong personalliggare?',
      a: `Ja, i regel. Hårvård räknas som kropps- och skönhetsvård, en av branscherna som ska föra personalliggare enligt Skatteverket. Undantag finns, till exempel när bara ägaren och den närmaste familjen arbetar där. Klokka är ingen personalliggare. Läs mer hos [Skatteverket](${skvBeauty}).`,
    },
    {
      q: 'Kan Klokka räkna provision?',
      a: 'Nej. Klokka räknar timmar, och med lön påslaget timmar gånger timlön. Provision räknas i lönesystemet.',
    },
    {
      q: 'Kan personalen se sina timmar i mobilen?',
      a: 'Ja. Var och en ser sina dagar, veckor och månad i Android-appen eller i webbläsaren på en iPhone, och får en notis när något ändras.',
    },
    {
      q: 'Vad händer om Skatteverket kommer på kontrollbesök?',
      a: 'Då är det personalliggaren de vill se, inte tidrapporten. Saknas en person i liggaren kan det bli en kontrollavgift på 12 500 kronor plus 2 500 kronor för varje person som inte är antecknad. Läs mer i [personalliggare eller tidrapport](page:guide-personalliggare).',
    },
    {
      q: 'Passar Klokka för en salong med en enda anställd?',
      a: 'Ja. Klokka fungerar lika bra för en anställd som för tio, och det finns ingen gräns uppåt.',
    },
  ],
  cta: {
    title: 'Skapa din salong i Klokka.',
    body: 'Bjud in personalen och för in den första dagen i dag. Gratis att använda.',
    button: 'Skapa ditt företag',
  },
} as const satisfies IndustryCopy;

export const en: PageCopyOf<typeof sv> = {
  meta: {
    title: 'Staff hours tracking for hair and beauty salons | Klokka',
    description:
      "Log your salon staff's hours and let them see their month in the app. Mistakes get flagged right away. Free to use and open source.",
    ogAlt: 'Staff hours tracking for hair and beauty salons: salon hours in the app.',
  },
  card: { eyebrow: 'Hair and beauty', title: 'Salon staff hours in the app' },
  breadcrumb: 'Hair and beauty salons',
  h1: 'Staff hours tracking for hair and beauty salons',
  lede: [
    "Klokka is staff hours tracking for hair and beauty salons: you log your staff's hours per day, and each of them sees their month on their phone and can flag an entry that is wrong. It is free to use, open source (MIT), has no limit on employees, and works on the web and in the Android app, in English and Swedish.",
  ],
  notice: `Klokka does not replace a personalliggare, the staff register some Swedish trades must keep. Hairdressers and other body and beauty care salons are covered by that requirement under Swedish Tax Agency rules, and the register is kept alongside the timesheet. Read more in [personalliggare in Sweden](page:guide-personalliggare) and at [Skatteverket](${skvBeauty}) (in Swedish).`,
  week: {
    title: 'Salong Sax',
    subtitle: 'Week 39, 21 to 27 September',
    label: 'Example: the week at Salong Sax, four employees',
    caption: 'Made-up salon, illustrative numbers. Open Tuesday to Saturday, and Saturday is a long day.',
  },
  sections: [
    {
      h2: 'What a week looks like at a salon',
      body: [
        'Salong Sax is open Tuesday to Saturday, so Monday shows as a day off for everyone. Hanna works full time and does every Saturday. Sofia works part time, three days plus Saturday. Leila works Wednesday to Saturday, and Amir is an apprentice who works Tuesday to Friday.',
        'You log the day once the salon has closed, or the whole week at once in the grid above. Same as yesterday fills in the days that look alike. If someone spends half a day on a course, you write it in the note for that day, so it is clear why the day was shorter.',
      ],
    },
    {
      h2: 'Nobody fills in a timesheet between two clients',
      body: [
        'In a salon the staff are at the chair all day. In Klokka they do not have to fill in anything: you log the hours, they see them on their phones and get a notification when anything is added, changed or removed. If an entry is wrong they flag it straight away, and the history keeps who changed what.',
      ],
    },
    {
      h2: 'Hours, not commission',
      body: [
        'Klokka counts hours. It does not calculate commission on treatments or product sales, nor unsocial-hours pay or overtime. With pay switched on, each person sees hours times their hourly rate, and the rest is handled in payroll based on your collective agreement.',
      ],
    },
    {
      h2: 'Part-timers and apprentices',
      body: [
        'Invite each person by name and email. There is no limit on the number of employees, so an apprentice or an extra stylist before Christmas is added in a minute. Many in the trade work part time or by the hour, read more about [hours tracking for hourly employees](page:hourly).',
      ],
    },
    {
      h2: 'Salons and the staff register',
      body: [
        'Body and beauty care is one of the six industries that must keep a personalliggare in 2026. The Swedish Tax Agency lists hair care, manicure and pedicure, massage and tattooing as examples, and what the business actually does decides, not its industry code. There are exemptions, for example when only the owner and close family work in the salon.',
        'The register records the name and personal identity number of everyone working, and when each shift starts and ends, noted as it happens. At an inspection visit, the register is what the Tax Agency asks for. If a person is missing from it, the control fee can be SEK 12,500 plus SEK 2,500 for each person not recorded.',
        'Klokka records hours after the fact and stores no identity numbers, so Klokka does not replace a personalliggare. The timesheet is the basis for pay, and the register is kept alongside it. More in [personalliggare in Sweden](page:guide-personalliggare).',
      ],
    },
    {
      h2: 'Month end',
      body: [
        'When the month is right, you lock it and export a CSV file for whoever runs payroll. If you would rather start on paper, there is a [timesheet template](page:template) to print.',
      ],
    },
    {
      h2: 'What Klokka does not do',
      body: [
        'Klokka takes no client bookings, does no scheduling, has no time clock and calculates no commission or payroll. It is not a personalliggare. See what it looks like in [the app](page:app).',
      ],
    },
  ],
  faq: [
    {
      q: 'Does a hair salon in Sweden need a personalliggare?',
      a: `As a rule, yes. Hair care counts as body and beauty care, one of the industries that must keep a personalliggare under Swedish Tax Agency rules. There are exemptions, for example when only the owner and close family work there. Klokka is not a personalliggare. Read more at [Skatteverket](${skvBeauty}) (in Swedish).`,
    },
    {
      q: 'Can Klokka calculate commission?',
      a: 'No. Klokka counts hours, and with pay switched on, hours times the hourly rate. Commission is worked out in payroll.',
    },
    {
      q: 'Can staff see their hours on their phones?',
      a: 'Yes. Each person sees their days, weeks and month in the Android app or in the browser on an iPhone, and gets a notification when anything changes.',
    },
    {
      q: 'What happens if the Tax Agency makes an inspection visit?',
      a: 'Then it is the personalliggare they want to see, not the timesheet. If a person is missing from the register, the control fee can be SEK 12,500 plus SEK 2,500 for each person not recorded. Read more in [personalliggare in Sweden](page:guide-personalliggare).',
    },
    {
      q: 'Does Klokka work for a salon with a single employee?',
      a: 'Yes. Klokka works just as well for one employee as for ten, and there is no upper limit.',
    },
  ],
  cta: {
    title: 'Set up your salon in Klokka.',
    body: 'Invite your staff and log the first day today. Free to use.',
    button: 'Create your business',
  },
};
