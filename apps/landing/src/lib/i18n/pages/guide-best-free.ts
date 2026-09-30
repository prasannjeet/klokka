import type { GuideCopy, PageCopyOf } from './types';

// Every fact about another app was read on the vendor's own site or repository on 2026-09-30 (the check date in the
// table caption); the URLs are the sources below. Owner decision: free-plan limits are named, prices never. A fact
// the vendor's page does not state is left out rather than guessed. The table is in alphabetical order.
const src = {
  clockify: 'https://clockify.me/pricing',
  connecteam: 'https://connecteam.com/pricing/',
  jibble: 'https://www.jibble.io/sv/prissattning',
  jibbleEn: 'https://www.jibble.io/pricing',
  kimai: 'https://www.kimai.org/en/',
  solidtime: 'https://www.solidtime.io/pricing',
  solidtimeRepo: 'https://github.com/solidtime-io/solidtime',
  workingTimer: 'https://workingtimer.com/sv/home',
  klokka: 'https://github.com/prasannjeet/klokka',
  // AGPL-3.0 section 13 (Remote Network Interaction), read on gnu.org 2026-09-30 (CHQ-149).
  agpl: 'https://www.gnu.org/licenses/agpl-3.0.html',
};

export const sv = {
  meta: {
    title: 'Bästa gratis tidrapportering 2026: appar jämförda | Klokka',
    description:
      'En ärlig jämförelse av gratis appar för tidrapportering 2026: Klokka, Jibble, Clockify, Kimai, solidtime och fler. Vad som är gratis och vad som saknas.',
    ogAlt: 'Jämförelse 2026: bästa gratis tidrapportering.',
  },
  card: { eyebrow: 'Jämförelse 2026', title: 'Bästa gratis tidrapportering' },
  breadcrumb: 'Guide: gratis appar',
  h1: 'Bästa gratis appar för tidrapportering 2026, jämförda ärligt',
  lede: [
    'Vilken gratis app för tidrapportering som passar bäst beror på vem som för in tiden: de anställda själva med en stämpelklocka, en person med en timer, eller arbetsgivaren i efterhand. Klokka är vår egen app, gratis att använda och med öppen källkod (MIT), och nedan står lika tydligt var den inte räcker till som var de andra inte gör det.',
    'Uppgifterna om de andra apparna kommer från deras egna webbplatser och kontrollerades den 30 september 2026. Gratisversioner ändras, så kontrollera alltid hos leverantören innan du bestämmer dig.',
  ],
  sections: [
    {
      h2: 'Kort svar',
      body: ['Det beror på vem som för in tiden:'],
      list: [
        'De anställda stämplar in och ut: Jibble och Connecteam har gratisversioner med stämpelklocka.',
        'Var och en mäter sin egen tid med en timer: Clockify för ett litet team, Working Timer för den som bara för sin egen tid.',
        'Du vill driva det själv med öppen källkod: Kimai, solidtime och [Klokka med öppen källkod](page:open-source).',
        'Du som arbetsgivare för in timmarna och de anställda ser dem: [Klokka-appen](page:app).',
        'Du vill inte ha någon app alls: en [gratis tidrapport mall](page:template) i Excel eller PDF.',
      ],
    },
    {
      h2: 'Så har vi jämfört',
      body: [
        'Vi har tittat på fem saker: vem som för in tiden, vad som är gratis enligt leverantören själv, om koden är öppen, vilka plattformar som finns och vad som saknas i gratisversionen. Varje uppgift om en annan app kommer från leverantörens egen webbplats eller kodförråd, som länkas under källor, och kontrollerades den 30 september 2026.',
        'Vi skriver inte ut vad något kostar, bara vad som ingår gratis. Skriver en leverantör inget om en sak står den inte med. Tabellen är i bokstavsordning, och Klokka beskrivs lika nyktert som de andra.',
      ],
    },
    {
      h2: 'Jämförelsetabell',
      body: ['Så här ser gratisversionerna ut, med vem som för in tiden i andra kolumnen:'],
      table: {
        caption: 'Gratisversionerna enligt leverantörernas egna webbplatser, kontrollerat 30 september 2026.',
        head: ['App', 'Vem för in tiden', 'Gratis enligt leverantören', 'Öppen källkod', 'Plattformar'],
        rows: [
          [
            `[Clockify](${src.clockify})`,
            'Var och en, med timer eller tidrapport',
            'Upp till 5 användare. Rapporter högst en månad bakåt.',
            'Nej',
            'Webb, iOS, Android, Windows, Mac, Linux',
          ],
          [
            `[Connecteam](${src.connecteam})`,
            'De anställda stämplar in',
            'Upp till 10 användare, med stämpelklocka och schema.',
            'Nej',
            'Webb, iOS, Android',
          ],
          [
            `[Jibble](${src.jibble})`,
            'De anställda stämplar in',
            'Gratis för alltid, obegränsat antal användare. Incheckning på webb och mobil, grundläggande tidrapporter.',
            'Nej',
            'Webb, iOS, Android, dator',
          ],
          [
            `[Kimai](${src.kimai})`,
            'Var och en, per projekt',
            'Gratis att driva själv. Molntjänsten kostar efter en provperiod.',
            'Ja, AGPL-3.0',
            'Webb',
          ],
          [
            `[Klokka](${src.klokka})`,
            'Arbetsgivaren, per dag. Den anställda ser och flaggar.',
            'Gratis att använda, ingen gräns för antalet anställda.',
            'Ja, MIT',
            'Webb, Android. iPhone via webben.',
          ],
          [
            `[solidtime](${src.solidtime})`,
            'Var och en, med timer och projekt',
            'Gratis att driva själv. I molnet gratis för en användare.',
            'Ja, AGPL-3.0',
            'Webb, datorapp',
          ],
          [
            `[Working Timer](${src.workingTimer})`,
            'Var och en, med timer',
            'Upp till 5 profiler och 3 aktiva projekt. Hantering av anställda kostar.',
            'Nej',
            'iOS, Android',
          ],
        ],
      },
    },
    {
      h2: 'Clockify',
      body: [
        'Clockify är gjort för att var och en ska mäta sin egen tid, med en timer som startas och stoppas eller en tidrapport per dag eller vecka. Enligt Clockify är gratisversionen till för upp till 5 användare, med obegränsad tidmätning, appar för mobil och dator, en översikt över teamet och enkla rapporter som sträcker sig en månad bakåt. Godkännanden, schema, GPS och stämpelklocka i kioskläge ingår inte gratis.',
        'Passar: ett litet team där var och en redovisar sin egen tid, ofta mot projekt. Passar sämre om det är du som arbetsgivare som ska föra in timmarna åt personalen.',
      ],
    },
    {
      h2: 'Connecteam',
      body: [
        'Connecteam är en app för personal som inte sitter vid ett skrivbord, med stämpelklocka, schema, chatt och mycket mer i samma app. Enligt Connecteam är deras gratisversion för småföretag gratis för alltid för upp till 10 användare, med alla delar och funktioner.',
        'Passar: ett företag med högst tio personer som vill att personalen stämplar in och ut, och som också vill ha schema. Tänk på att det är de anställda som registrerar sin tid, och att taket är tio användare.',
      ],
    },
    {
      h2: 'Jibble',
      body: [
        'Jibble är en stämpelklocka: de anställda checkar in och ut på webben, i mobilen eller på en gemensam surfplatta. Enligt Jibble är gratisversionen gratis för alltid med obegränsat antal användare, och den innehåller incheckning på webb och mobil, grundläggande tidrapporter och integrationer med Slack, Microsoft Teams och QuickBooks. Jibble har en svensk webbplats.',
        'Passar: ett företag där personalen ska stämpla in, oavsett hur många de är. Tänk på att det är de anställda som registrerar sin tid, inte arbetsgivaren i efterhand.',
      ],
    },
    {
      h2: 'Kimai',
      body: [
        'Kimai har öppen källkod under AGPL-3.0 och är gjort för projektbaserade team, frilansare och byråer. Driver du Kimai själv, med Docker eller en manuell installation, är det gratis. Kimai finns också som molntjänst, som kostar efter en gratis provperiod. Kimai finns på mer än 30 språk, svenska inräknat.',
        'Passar: den som vill ha full kontroll över sina data och har någon som kan sköta en server. Tänk på att tiden redovisas per person och projekt, och att det kräver drift att köra den själv.',
      ],
    },
    {
      h2: 'Klokka',
      body: [
        'Klokka är vår egen app. Här är det arbetsgivaren som för in varje anställds timmar per dag, och den anställda ser samma siffror i mobilen, får en notis när något ändras och kan flagga en rad som är fel. Månaden kan låsas och exporteras som CSV. Klokka är gratis att använda, har öppen källkod under MIT-licens, ingen gräns för antalet anställda och fungerar på webben och i Android-appen, på svenska och engelska.',
        'Det Klokka inte har: ingen stämpelklocka, inga scheman, ingen koppling till lönesystem (bara CSV-exporten) och ingen app i App Store, så på iPhone används webbappen. De anställda kan inte föra in egna timmar. Passar: en arbetsgivare med några timanställda som redan vet vem som jobbade och vill att båda ska se samma månad. Läs mer om [Klokka-appen](page:app).',
      ],
    },
    {
      h2: 'solidtime',
      body: [
        'solidtime har öppen källkod under AGPL-3.0 och är byggt för frilansare och team som mäter tid mot kunder och projekt, med timer, debiterbara timmar och rapporter. Du kan driva solidtime själv, och i molnet är den minsta versionen gratis för en användare. Det finns en webbapp och en datorapp.',
        'Passar: en frilansare, eller ett team som vill driva sin egen server. Tänk på att gratis i molnet gäller en person, inte ett team.',
      ],
    },
    {
      h2: 'Working Timer',
      body: [
        'Working Timer är en app för den som vill hålla koll på sin egen arbetstid, med en timer som startas och stoppas med ett tryck. Enligt Working Timer är gratisversionen gratis för alltid, med upp till 5 profiler, 3 aktiva projekt, data i molnet och arbetsrapporter i PDF eller Excel, i apparna för Android och iOS. Att hantera anställda ingår bara i företagsversionen, som kostar. Webbplatsen finns på svenska.',
        'Passar: en anställd eller frilansare som vill föra sin egen tid.',
      ],
    },
    {
      h2: 'Gratisversion eller öppen källkod',
      body: [
        'En gratisversion är leverantörens beslut, och villkoren kan ändras. Öppen källkod betyder att koden får användas, ändras och köras av vem som helst enligt licensen, också om tjänsten skulle försvinna. Det kräver att någon kan driva en server.',
        `Kimai och solidtime använder [AGPL-3.0](${src.agpl}), som kräver att den som ändrar programmet och låter andra använda den ändrade versionen över ett nätverk också erbjuder dem källkoden till den (avsnitt 13). Klokka använder MIT, som tillåter nästan allt så länge upphovsrätten och licenstexten följer med. Klokkas kod och Dockerfiles finns på GitHub.`,
      ],
    },
    {
      h2: 'Innan du väljer',
      body: ['Fem frågor som brukar avgöra:'],
      list: [
        'Vem ska föra in tiden: de anställda, var och en med en timer, eller du i efterhand?',
        'Behöver din bransch en personalliggare? Då behövs ett system som uppfyller Skatteverkets krav, vid sidan av tidrapporten. Se [personalliggare eller tidrapport](page:guide-personalliggare).',
        'Vad behöver den som sköter lönen: en fil, eller en direkt koppling till lönesystemet?',
        'Hur många är ni i dag, och om ett år? Flera gratisversioner har ett tak för antalet användare.',
        'Var lagras uppgifterna, och kan du ta med dem om du byter?',
      ],
    },
    {
      h2: 'När du inte behöver en app',
      body: [
        'Är ni två eller tre och ser timmarna likadana ut varje vecka räcker ofta ett papper eller ett kalkylark. Vår [gratis tidrapport mall](page:template) finns i Excel och PDF, och [kalkylatorn för arbetstid](page:calculator) räknar ihop pass och raster. Guiden om [vad en tidrapport ska innehålla](page:guide-timesheet) hjälper dig få med det viktiga.',
      ],
    },
  ],
  faq: [
    {
      q: 'Vilken gratis app för tidrapportering är bäst?',
      a: 'Det beror på vem som för in tiden. Ska de anställda stämpla in passar Jibble eller Connecteam. Mäter var och en sin egen tid passar Clockify. Vill du driva allt själv finns Kimai, solidtime och Klokka med öppen källkod. Vill du som arbetsgivare föra in timmarna och låta de anställda se dem är det vad Klokka är gjort för.',
    },
    {
      q: 'Vilken är den bästa gratis appen för stämpelklocka?',
      a: 'Klokka är ingen stämpelklocka. Av apparna här har Jibble (obegränsat antal användare enligt Jibble) och Connecteam (upp till 10 användare enligt Connecteam) gratisversioner med stämpelklocka.',
    },
    {
      q: 'Finns det tidrapportering med öppen källkod?',
      a: 'Ja. Kimai och solidtime har öppen källkod under AGPL-3.0, och Klokka under MIT. Kimai och solidtime beskriver hur man driver dem själv, och Klokkas kod och Dockerfiles finns på GitHub.',
    },
    {
      q: 'Kan en gratis app ersätta en personalliggare?',
      a: 'Bara om appen uppfyller Skatteverkets krav på personalliggare: namn och personnummer på alla som arbetar, pass som antecknas när de börjar och slutar, och för en elektronisk liggare en logg över alla ändringar. Klokka gör inte det. Läs mer i [personalliggare eller tidrapport](page:guide-personalliggare).',
    },
    {
      q: 'Vilken app kan jag använda för att registrera min arbetstid?',
      a: 'För din egen tid passar en app med timer, som Clockify eller Working Timer. Är det din arbetsgivare som för in timmarna i Klokka ser du dem i appen utan att göra något själv.',
    },
  ],
  cta: {
    title: 'Passar Klokka? Skapa ditt företag.',
    body: 'Gratis att använda och ingen gräns för antalet anställda. Se först [hur appen fungerar](page:app).',
    button: 'Skapa ditt företag',
  },
  author: 'Klokka',
  reviewed: '2026-09-30',
  sources: [
    { label: 'Clockify, planer och gratisversionen, kontrollerad 2026-09-30', url: src.clockify },
    { label: 'Connecteam, planer och gratisversionen, kontrollerad 2026-09-30', url: src.connecteam },
    { label: 'Jibble, planer på svenska, kontrollerad 2026-09-30', url: src.jibble },
    { label: 'Jibble, planer på engelska, kontrollerad 2026-09-30', url: src.jibbleEn },
    { label: 'Kimai, startsida, kontrollerad 2026-09-30', url: src.kimai },
    { label: 'solidtime, planer och gratisversionen, kontrollerad 2026-09-30', url: src.solidtime },
    { label: 'solidtime, kodförråd och licens på GitHub, kontrollerad 2026-09-30', url: src.solidtimeRepo },
    { label: 'Working Timer, svensk startsida, kontrollerad 2026-09-30', url: src.workingTimer },
    { label: 'Klokka, kodförråd och licens på GitHub', url: src.klokka },
    { label: 'GNU Affero General Public License 3.0, gnu.org (engelska)', url: src.agpl },
  ],
} as const satisfies GuideCopy;

export const en: PageCopyOf<typeof sv> = {
  meta: {
    title: 'Best free timesheet apps for small teams (2026) | Klokka',
    description:
      'An honest comparison of free timesheet apps in 2026: Klokka, Jibble, Clockify, Kimai, solidtime and more. What is free, and what is missing.',
    ogAlt: 'Compared, 2026: the best free timesheet apps.',
  },
  card: { eyebrow: 'Compared, 2026', title: 'Best free timesheet apps' },
  breadcrumb: 'Guide: free timesheet apps',
  h1: 'The best free timesheet apps in 2026, compared honestly',
  lede: [
    'Which free timesheet app fits best depends on who records the time: employees clocking in, a person running a timer, or the employer afterwards. Klokka is our own app, free to use and open source (MIT), and below we are as clear about where it falls short as about the others.',
    'The facts about the other apps come from their own websites and were checked on 30 September 2026. Free offers change, so always check with the vendor before you decide.',
  ],
  sections: [
    {
      h2: 'The short answer',
      body: ['It depends on who records the time:'],
      list: [
        'Employees clock in and out: Jibble and Connecteam have free versions with a time clock.',
        'Each person times their own work: Clockify for a small team, Working Timer for someone tracking only their own time.',
        'You want to host it yourself as open source: Kimai, solidtime and [Klokka as open source](page:open-source).',
        'You, the employer, log the hours and your staff see them: [the Klokka app](page:app).',
        'You do not want an app at all: a [free timesheet template](page:template) in Excel or PDF.',
      ],
    },
    {
      h2: 'How we compared',
      body: [
        "We looked at five things: who records the time, what is free according to the vendor itself, whether the code is open, which platforms exist and what the free version leaves out. Every fact about another app comes from the vendor's own website or code repository, linked under sources, and was checked on 30 September 2026.",
        'We leave out what anything costs and name only what is included for free. If a vendor says nothing about something, it is left out. The table is in alphabetical order, and Klokka is described as plainly as the others.',
      ],
    },
    {
      h2: 'Comparison table',
      body: ['This is what the free versions look like, with who records the time in the second column:'],
      table: {
        caption: "The free versions according to the vendors' own websites, checked 30 September 2026.",
        head: ['App', 'Who records the time', 'Free, as the vendor states it', 'Open source', 'Platforms'],
        rows: [
          [
            `[Clockify](${src.clockify})`,
            'Each person, with a timer or timesheet',
            'Up to 5 users. Reports go back at most one month.',
            'No',
            'Web, iOS, Android, Windows, Mac, Linux',
          ],
          [
            `[Connecteam](${src.connecteam})`,
            'Employees clock in',
            'Up to 10 users, with time clock and scheduling.',
            'No',
            'Web, iOS, Android',
          ],
          [
            `[Jibble](${src.jibbleEn})`,
            'Employees clock in',
            'Free forever, unlimited users. Web and mobile check-in, basic timesheets.',
            'No',
            'Web, iOS, Android, desktop',
          ],
          [
            `[Kimai](${src.kimai})`,
            'Each person, per project',
            'Free to host yourself. The cloud service is paid after a trial.',
            'Yes, AGPL-3.0',
            'Web',
          ],
          [
            `[Klokka](${src.klokka})`,
            'The employer, per day. The employee sees and flags.',
            'Free to use, no limit on employees.',
            'Yes, MIT',
            'Web, Android. iPhone through the web.',
          ],
          [
            `[solidtime](${src.solidtime})`,
            'Each person, with timer and projects',
            'Free to host yourself. Free in the cloud for one user.',
            'Yes, AGPL-3.0',
            'Web, desktop app',
          ],
          [
            `[Working Timer](${src.workingTimer})`,
            'Each person, with a timer',
            'Up to 5 profiles and 3 active projects. Managing employees is paid.',
            'No',
            'iOS, Android',
          ],
        ],
      },
    },
    {
      h2: 'Clockify',
      body: [
        'Clockify is made for each person to track their own time, with a timer they start and stop or a timesheet per day or week. According to Clockify, the free version is for up to 5 users, with unlimited tracking, mobile and desktop apps, a team overview and basic reports that reach back one month. Approvals, scheduling, GPS and a kiosk time clock are not included for free.',
        'Fits: a small team where each person reports their own time, often against projects. A poorer fit if you, the employer, are the one logging the hours for your staff.',
      ],
    },
    {
      h2: 'Connecteam',
      body: [
        'Connecteam is an app for staff who do not sit at a desk, with a time clock, scheduling, chat and a lot more in one app. According to Connecteam, its small business version is free for life for up to 10 users, with all hubs and features.',
        'Fits: a business of ten people or fewer that wants staff to clock in and out, and also wants scheduling. Keep in mind that the employees record their own time, and that the limit is ten users.',
      ],
    },
    {
      h2: 'Jibble',
      body: [
        'Jibble is a time clock: employees check in and out on the web, on their phones or on a shared tablet. According to Jibble, the free version is free forever with unlimited users, and it includes web and mobile check-in, basic timesheets and integrations with Slack, Microsoft Teams and QuickBooks. Jibble has a Swedish-language website.',
        'Fits: a business where staff should clock in, however many they are. Keep in mind that the employees record their own time, not the employer afterwards.',
      ],
    },
    {
      h2: 'Kimai',
      body: [
        'Kimai is open source under AGPL-3.0 and made for project-driven teams, freelancers and agencies. If you host Kimai yourself, with Docker or a manual install, it is free. Kimai also runs as a cloud service, which is paid after a free trial. Kimai is available in more than 30 languages, Swedish included.',
        'Fits: anyone who wants full control of their data and has someone to run a server. Keep in mind that time is recorded per person and project, and that hosting it yourself takes upkeep.',
      ],
    },
    {
      h2: 'Klokka',
      body: [
        "Klokka is our own app. Here the employer logs each employee's hours per day, and the employee sees the same numbers on their phone, is notified when anything changes and can flag an entry that is wrong. The month can be locked and exported as CSV. Klokka is free to use, open source under the MIT licence, has no limit on employees, and works on the web and in the Android app, in English and Swedish.",
        'What Klokka does not have: no time clock, no scheduling, no link to payroll systems (only the CSV export) and no App Store app, so iPhone users use the web app. Employees cannot log their own hours. Fits: an employer with a few hourly staff who already knows who worked and wants both sides to see the same month. Read more about [the Klokka app](page:app).',
      ],
    },
    {
      h2: 'solidtime',
      body: [
        'solidtime is open source under AGPL-3.0 and built for freelancers and teams tracking time against clients and projects, with a timer, billable hours and reports. You can host solidtime yourself, and in the cloud the smallest version is free for one user. There is a web app and a desktop app.',
        'Fits: a freelancer, or a team that wants to run its own server. Keep in mind that the free cloud version is for one person, not a team.',
      ],
    },
    {
      h2: 'Working Timer',
      body: [
        'Working Timer is an app for keeping track of your own working time, with a timer you start and stop with one tap. According to Working Timer, the free version is free forever, with up to 5 profiles, 3 active projects, cloud data and work reports in PDF or Excel, in the Android and iOS apps. Managing employees is only included in the business version, which is paid. The website is available in Swedish.',
        'Fits: an employee or freelancer who wants to keep their own record.',
      ],
    },
    {
      h2: 'Free version or open source',
      body: [
        "A free version is the vendor's decision, and the terms can change. Open source means anyone may use, change and run the code under its licence, even if the service were to disappear. It does take someone who can run a server.",
        `Kimai and solidtime use [AGPL-3.0](${src.agpl}), which requires anyone who modifies the program and lets others use the modified version over a network to offer them its source code too (section 13). Klokka uses MIT, which allows almost anything as long as the copyright and licence text come along. The Klokka code and Dockerfiles are on GitHub.`,
      ],
    },
    {
      h2: 'Before you choose',
      body: ['Five questions that usually decide it:'],
      list: [
        'Who should record the time: the employees, each person with a timer, or you afterwards?',
        'Does your trade need a personalliggare, the Swedish staff register? Then you need a system that meets the Tax Agency requirements, alongside the timesheet. See [personalliggare in Sweden](page:guide-personalliggare).',
        'What does whoever runs payroll need: a file, or a direct link to the payroll system?',
        'How many of you are there today, and in a year? Several free versions cap the number of users.',
        'Where is the data stored, and can you take it with you if you switch?',
      ],
    },
    {
      h2: 'When you do not need an app',
      body: [
        'If there are two or three of you and the hours look the same every week, paper or a spreadsheet is often enough. Our [free timesheet template](page:template) comes in Excel and PDF, and the [work hours calculator](page:calculator) adds up shifts and breaks. The guide on [how to track employee hours](page:guide-timesheet) helps you cover what matters.',
      ],
    },
  ],
  faq: [
    {
      q: 'What is the best free timesheet app?',
      a: 'It depends on who records the time. If employees should clock in, Jibble or Connecteam fit. If each person times their own work, Clockify fits. If you want to host it yourself, Kimai, solidtime and Klokka are open source. If you, the employer, want to log the hours and let your staff see them, that is what Klokka is made for.',
    },
    {
      q: 'What is the best free time clock app?',
      a: 'Klokka is not a time clock. Of the apps here, Jibble (unlimited users, according to Jibble) and Connecteam (up to 10 users, according to Connecteam) have free versions with a time clock.',
    },
    {
      q: 'Is there open source time tracking?',
      a: 'Yes. Kimai and solidtime are open source under AGPL-3.0, and Klokka under MIT. Kimai and solidtime document how to host them yourself, and the Klokka code and Dockerfiles are on GitHub.',
    },
    {
      q: 'Can a free app replace a personalliggare in Sweden?',
      a: 'Only if the app meets the Swedish Tax Agency requirements for a personalliggare: the name and identity number of everyone working, shifts noted as they start and end, and for an electronic register a log of every change. Klokka does not. Read more in [personalliggare in Sweden](page:guide-personalliggare).',
    },
    {
      q: 'What is a good free Clockify alternative?',
      a: 'It depends on what you miss. For more users in a free version, Jibble states unlimited users. For open source you can host yourself, Kimai and solidtime are the closest match. If you are an employer logging staff hours, Klokka works differently: you log, they see.',
    },
  ],
  cta: {
    title: 'Does Klokka fit? Create your business.',
    body: 'Free to use and no limit on employees. First see [how the app works](page:app).',
    button: 'Create your business',
  },
  author: 'Klokka',
  reviewed: '2026-09-30',
  sources: [
    { label: 'Clockify, plans and the free version, checked 2026-09-30', url: src.clockify },
    { label: 'Connecteam, plans and the free version, checked 2026-09-30', url: src.connecteam },
    { label: 'Jibble, plans in Swedish, checked 2026-09-30', url: src.jibble },
    { label: 'Jibble, plans in English, checked 2026-09-30', url: src.jibbleEn },
    { label: 'Kimai, home page, checked 2026-09-30', url: src.kimai },
    { label: 'solidtime, plans and the free version, checked 2026-09-30', url: src.solidtime },
    { label: 'solidtime, code repository and licence on GitHub, checked 2026-09-30', url: src.solidtimeRepo },
    { label: 'Working Timer, Swedish home page, checked 2026-09-30', url: src.workingTimer },
    { label: 'Klokka, code repository and licence on GitHub', url: src.klokka },
    { label: 'GNU Affero General Public License 3.0, gnu.org', url: src.agpl },
  ],
};
