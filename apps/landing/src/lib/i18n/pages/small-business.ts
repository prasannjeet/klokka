import type { PageCopyBase, PageCopyOf } from './types';

export const sv = {
  meta: {
    title: 'Tidrapportering för småföretag med anställda | Klokka',
    description:
      'Tidrapportering för småföretag: fyll i veckan på en minut, lås månaden och exportera till CSV. Alla ändringar sparas. Gratis, öppen källkod.',
    ogAlt: 'Tidrapportering för småföretag: en hel vecka på en minut.',
  },
  card: { eyebrow: 'För småföretag', title: 'En hel vecka på en minut' },
  breadcrumb: 'För småföretag',
  h1: 'Tidrapportering för småföretag med några få anställda',
  lede: [
    'Klokka är ett gratis tidrapporteringssystem för småföretag: du som arbetsgivare loggar varje anställds timmar per dag, och de anställda ser samma siffror i mobilen. Det har öppen källkod under MIT-licens, ingen gräns för antalet anställda och fungerar på webben och i Android-appen, på svenska och engelska.',
    'Klokka är gjort för [kaféet](page:trade-cafe), [salongen](page:trade-salon), [städfirman](page:trade-cleaning) och [butiken](page:trade-shop): ställen där ägaren vet vem som jobbade och bara vill att timmarna ska stämma, utan ett system som kräver en utbildning.',
  ],
  sections: [
    {
      h2: 'Kalkylark eller system?',
      body: [
        'Ett kalkylark räcker långt för många. Det kostar inget och alla kan det. Det som saknas märks först när någon undrar över en siffra: den anställda ser inte arket när det ändras, ingen historik visar vem som ändrade vad, och det finns inget enkelt sätt att säga att en rad är fel.',
        'Börjar du på papper eller i Excel finns en [gratis mall för tidrapport](page:template) att ladda ner, och en guide om [vad en tidrapport ska innehålla](page:guide-timesheet). Vill du att båda ska se samma månad, direkt, är det det Klokka gör.',
      ],
    },
    {
      h2: 'Så ser en månad ut',
      body: [
        'Ta ett kafé med fyra anställda. Varje kväll, eller en gång i veckan, fyller ägaren i veckorutnätet: Maria 4 timmar, Jonas 8, Ayla ledig. Samma som i går fyller i dagarna som ser likadana ut, så en hel vecka tar ungefär en minut.',
        'Jonas ser att tisdagen står på 4 timmar fast han jobbade 6 och flaggar den. Ägaren får en notis, rättar posten och Jonas får veta att det är åtgärdat. I slutet av månaden låser ägaren september och exporterar filen till den som sköter lönen.',
      ],
    },
    {
      h2: 'Du för in timmarna, de ser dem',
      body: [
        'I ett litet företag är det oftast ägaren som vet vem som jobbade och hur länge. Därför är det arbetsgivaren som för in timmarna i Klokka, och de anställda som ser dem direkt i mobilen, med en notis när något ändras.',
        'De anställda kan inte föra in egna timmar i den här versionen. De kan flagga en post som ser fel ut, och historiken visar vad som hände med flaggan.',
      ],
    },
    {
      h2: 'Lås månaden och lämna över till lönen',
      body: [
        'När månaden stämmer låser du den. Då går det inte att ändra något förrän du låser upp den igen, och de anställda får veta att månaden är stängd.',
        'Sedan exporterar du månaden som en CSV-fil, för en person eller hela företaget. Filen öppnas direkt i Excel och innehåller datum, veckodag, anställd, timmar och anteckning, plus timlön och belopp om lön är påslaget. Den kan lämnas till redovisningsbyrån eller läsas in i löneprogrammet. Klokka har ingen direkt koppling till något lönesystem.',
      ],
    },
    {
      h2: 'Lön på eller av',
      body: [
        'Lön är ett reglage för företaget och det är av från början. Av: Klokka visar bara timmar. På: varje anställd får en timlön och ser beloppet bredvid timmarna. Den som saknar timlön ser bara timmar.',
      ],
    },
    {
      h2: 'Flera företag, en inloggning',
      body: [
        'Har du två företag byter du mellan dem i samma app. Jobbar någon av dina anställda även på ett annat ställe som använder Klokka ser hen båda, var för sig, med samma inloggning.',
      ],
    },
    {
      h2: 'Vad Klokka inte gör',
      body: [
        'Klokka gör inga scheman, har ingen stämpelklocka och kör ingen lön. Klokka räknar inte ut OB eller övertid, och det är ingen [personalliggare](page:guide-personalliggare). Klokka gör en sak: timmarna som har jobbats, så att båda är överens.',
      ],
    },
    {
      h2: 'Kom igång på fem minuter',
      body: ['Du behöver bara en e-postadress för dig själv och för var och en av de anställda.'],
      list: [
        'Skapa ditt företag i webbappen. Det är gratis och kräver inget kort.',
        'Bjud in de anställda med namn och e-post. De får ett mejl, väljer ett lösenord och hamnar i ditt företag.',
        'För in den första dagen. De anställda ser den direkt, i [appen](page:app) eller på webben.',
      ],
    },
  ],
  faq: [
    {
      q: 'Måste man tidrapportera varje vecka?',
      a: '[Arbetstidslagen](page:guide-working-hours-act) säger inte hur ofta ordinarie timmar ska rapporteras. Den kräver att arbetsgivaren för anteckningar om jourtid, övertid och mertid. Många arbetsgivare och kollektivavtal har en rutin per vecka eller månad. I Klokka förs timmarna in per dag, stäms av per vecka och stängs per månad. Läs mer i guiden om [tidrapport](page:guide-timesheet).',
    },
    {
      q: 'Hur rapporterar jag arbetstid?',
      a: 'Det beror på arbetsgivarens system. I Klokka är det arbetsgivaren som för in timmarna per dag, och den anställda ser dem och kan flagga en post som är fel.',
    },
    {
      q: 'Kan jag skicka timmarna till Fortnox eller Visma?',
      a: 'Via CSV-exporten. Klokka har ingen direkt koppling till något lönesystem, men filen öppnas i Excel och kan läsas in där löneprogrammet tar emot en fil.',
    },
    {
      q: 'Hur många anställda kan jag lägga till?',
      a: 'Så många du behöver. Det finns ingen gräns för antalet anställda.',
    },
    {
      q: 'Är det verkligen gratis?',
      a: 'Ja. Klokka är gratis att använda och du behöver inget kort. Koden har öppen källkod under MIT-licens, så du kan också [köra Klokka själv](page:open-source).',
    },
  ],
  cta: {
    title: 'Skapa ditt företag. För in timmar i dag.',
    body: 'Fem minuter från registreringen till den första timmen. Se också [hur appen funkar](page:app).',
    button: 'Skapa ditt företag',
  },
} as const satisfies PageCopyBase;

export const en: PageCopyOf<typeof sv> = {
  meta: {
    title: 'Timesheet app for small business and hourly staff | Klokka',
    description:
      'A free timesheet app for small business: fill in the week in a minute, lock the month and export to CSV. Every change is kept. Open source.',
    ogAlt: 'Timesheet app for small business: log a week in a minute.',
  },
  card: { eyebrow: 'For small businesses', title: 'Log a week in a minute' },
  breadcrumb: 'Small businesses',
  h1: 'A timesheet app for small businesses with hourly staff',
  lede: [
    "Klokka is free time tracking for small businesses: you, the employer, log each employee's hours per day, and your staff see the same numbers on their phones. It is open source under the MIT licence, has no limit on employees, and works on the web and in the Android app, in English and Swedish.",
    'Klokka is made for [the café](page:trade-cafe), [the salon](page:trade-salon), [the cleaning company](page:trade-cleaning) and [the shop](page:trade-shop): places where the owner knows who worked and just wants the hours to be right, without a system that needs a training course.',
  ],
  sections: [
    {
      h2: 'Spreadsheet or system?',
      body: [
        'A spreadsheet goes a long way for many. It costs nothing and everyone knows it. What is missing shows up when someone questions a number: the employee does not see the sheet when it changes, no history shows who changed what, and there is no simple way to say a row is wrong.',
        'If you start on paper or in Excel, there is a [free timesheet template](page:template) to download, and a guide on [what an hours record should contain](page:guide-timesheet). If you want both sides to see the same month, straight away, that is what Klokka does.',
      ],
    },
    {
      h2: 'What a month looks like',
      body: [
        'Take a café with four staff. Every evening, or once a week, the owner fills in the week grid: Maria 4 hours, Jonas 8, Ayla off. Same as yesterday fills in the days that look alike, so a whole week takes about a minute.',
        'Jonas sees that Tuesday says 4 hours when he worked 6, and flags it. The owner gets a notification, fixes the entry, and Jonas is told it is resolved. At the end of the month the owner locks September and exports the file for whoever runs payroll.',
      ],
    },
    {
      h2: 'You log the hours, they see them',
      body: [
        'In a small business it is usually the owner who knows who worked and for how long. That is why the employer logs the hours in Klokka, and the staff see them on their phones straight away, with a notification when anything changes.',
        'Staff cannot log their own hours in this version. They can flag an entry that looks wrong, and the history shows what happened to the flag.',
      ],
    },
    {
      h2: 'Lock the month and hand it to payroll',
      body: [
        'When the month is right, you lock it. Nothing can be changed until you unlock it again, and your staff are told the month is closed.',
        'Then you export the month as a CSV file, for one person or the whole business. The file opens directly in Excel and holds the date, weekday, employee, hours and note, plus hourly rate and amount when pay is switched on. You can hand it to your accountant or import it into your payroll software. Klokka has no direct link to any payroll system.',
      ],
    },
    {
      h2: 'Pay on or off',
      body: [
        'Pay is a switch for the business and it starts off. Off: Klokka shows hours only. On: each employee gets an hourly rate and sees the amount next to the hours. Anyone without a rate sees hours only.',
      ],
    },
    {
      h2: 'Several businesses, one login',
      body: [
        'If you run two businesses, you switch between them in the same app. If one of your staff also works somewhere else that uses Klokka, they see both, separately, with the same login.',
      ],
    },
    {
      h2: 'What Klokka does not do',
      body: [
        'Klokka does no scheduling, has no time clock and runs no payroll. It does not calculate unsocial-hours pay or overtime, and it is not a [personalliggare](page:guide-personalliggare) (the staff register some Swedish trades must keep). Klokka does one thing: the hours worked, so both sides agree.',
      ],
    },
    {
      h2: 'Get started in five minutes',
      body: ['All you need is an email address for yourself and for each of your staff.'],
      list: [
        'Create your business in the web app. It is free and needs no card.',
        'Invite your staff by name and email. They get an email, choose a password and join your business.',
        'Log the first day. Your staff see it straight away, in [the app](page:app) or on the web.',
      ],
    },
  ],
  faq: [
    {
      q: 'Do I need to report hours every week?',
      a: 'The [Swedish Working Hours Act](page:guide-working-hours-act) does not say how often ordinary hours must be reported. It requires the employer to keep records of on-call time, overtime and additional hours. Many employers and collective agreements use a weekly or monthly routine. In Klokka the hours are logged per day, checked per week and closed per month. Read more in the guide on [how to track employee hours](page:guide-timesheet).',
    },
    {
      q: 'How do I record working hours?',
      a: "It depends on the employer's system. In Klokka the employer logs the hours per day, and the employee sees them and can flag an entry that is wrong.",
    },
    {
      q: 'Can I send the hours to my payroll software?',
      a: 'Through the CSV export. Klokka has no direct link to any payroll system, but the file opens in Excel and can be imported wherever your payroll software accepts a file.',
    },
    {
      q: 'How many employees can I add?',
      a: 'As many as you need. There is no limit on the number of employees.',
    },
    {
      q: 'Is it really free?',
      a: 'Yes. Klokka is free to use and needs no card. The code is open source under the MIT licence, so you can also [run Klokka yourself](page:open-source).',
    },
  ],
  cta: {
    title: 'Create your business. Log hours today.',
    body: 'Five minutes from sign-up to the first logged hour. See also [how the app works](page:app).',
    button: 'Create your business',
  },
};
