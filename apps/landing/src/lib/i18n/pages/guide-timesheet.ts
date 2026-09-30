import type { GuideCopy, PageCopyOf } from './types';

// Fact check 2026-09-30 (CHQ-149) against the official texts linked in `sources`: arbetstidslagen 11 and 24 §§,
// AFS 2023:2 kap. 9 (3 to 9 §§), av.se on records (paper or computer; keep track of ordinary hours too),
// bokföringslagen 1 kap. 2 § 9 and 7 kap. 2 §. The "seven years" rule of thumb was cut: the law's retention period is
// stated as written.
const atl =
  'https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/arbetstidslag-1982673_sfs-1982-673/';
const afs =
  'https://www.av.se/globalassets/filer/publikationer/foreskrifter/planering-och-organisering-av-arbetsmiljoarbete-grundlaggande-skyldigheter-for-dig-med-arbetsgivaransvar-afs2023-2.pdf';
const avRecords =
  'https://www.av.se/arbetsmiljoarbete-och-inspektioner/arbetsgivarens-ansvar-for-arbetsmiljon/anteckna-uppgifter-om-jourtid-overtid-och-mertid/';
const bfl =
  'https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/bokforingslag-19991078_sfs-1999-1078/';

export const sv = {
  meta: {
    title: 'Tidrapport: vad den ska innehålla och hur du för den',
    description:
      'Allt en arbetsgivare behöver veta om tidrapporten: vad den ska innehålla, vad lagen kräver, hur länge den sparas och en enkel rutin för månaden.',
    ogAlt: 'Guide: så för du tidrapport.',
  },
  card: { eyebrow: 'Guide', title: 'Så för du tidrapport' },
  breadcrumb: 'Guide: tidrapport',
  h1: 'Tidrapport: vad den ska innehålla och hur du för den',
  lede: [
    'En tidrapport är en sammanställning av hur många timmar en anställd har arbetat, dag för dag, och den är underlaget för lönen när lönen beror på arbetad tid. Den här guiden går igenom vad en tidrapport brukar innehålla, vad arbetstidslagen kräver att arbetsgivaren antecknar och en enkel rutin för månadsslutet.',
  ],
  sections: [
    {
      h2: 'Vad är en tidrapport?',
      body: [
        'En tidrapport visar vilka dagar en person har arbetat och hur många timmar, ofta med start- och sluttid, raster och en kommentar. För timanställda och deltidsanställda är den grunden för lönen. För heltidsanställda med fast månadslön används den oftast för att hålla koll på övertid, frånvaro och flex.',
        'Tidrapportering är arbetet med att föra in och stämma av timmarna, varje dag, vecka eller månad. Det kan göras på papper, i ett kalkylark eller i en app, och antingen av den anställda själv eller av arbetsgivaren.',
      ],
    },
    {
      h2: 'Vad en tidrapport brukar innehålla',
      body: [
        `Det finns inga krav på exakt hur anteckningarna ska se ut, skriver [Arbetsmiljöverket](${avRecords}), men de flesta tidrapporter innehåller samma delar. Ju tydligare de är, desto färre frågor blir det när lönen betalas ut. Behöver du räkna fram timmarna från start- och sluttider med rast kan du [räkna ut arbetstid](page:calculator) med vår räknare.`,
      ],
      list: [
        'Företagets och den anställdas namn, och vilken period rapporten gäller.',
        'Datum för varje arbetsdag.',
        'Start- och sluttid, eller antalet arbetade timmar.',
        'Raster som inte räknas som arbetstid.',
        'Övertid och mertid, för sig, om det förekommer.',
        'Jourtid, om det förekommer.',
        'Frånvaro, till exempel sjukdom eller semester.',
        'En anteckning när något avviker, och ett sätt att visa att båda har godkänt rapporten.',
      ],
    },
    {
      h2: 'Vad arbetstidslagen kräver av arbetsgivaren',
      body: [
        `Enligt [arbetstidslagen 11 §](${atl}) ska arbetsgivaren föra anteckningar om jourtid, övertid och mertid. De anställda har rätt att själva, eller genom någon annan, ta del av anteckningarna, och samma rätt har fackliga organisationer som företräder de anställda på arbetsstället.`,
        `Lagen kräver alltså uttryckligen anteckningar om jourtid, övertid och mertid, inte om varje ordinarie timme. [Arbetsmiljöverket](${avRecords}) skriver ändå att alla arbetsgivare ska hålla koll på både den ordinarie arbetstiden och tiden utöver den. I praktiken går övertid och mertid ändå bara att räkna ut om man vet hur mycket någon har arbetat totalt, och för [timanställda](page:hourly) är timmarna underlaget för lönen. Därför för de flesta arbetsgivare in alla timmar.`,
        `Hur anteckningarna ska se ut står i Arbetsmiljöverkets föreskrifter, [AFS 2023:2 kapitel 9](${afs}). Arbetsgivaren bestämmer i vilken handling de förs, på papper eller i datorn, men de ska vara tydliga och överskådliga och innehålla:`,
      ],
      list: [
        'arbetsgivarens namn och arbetsstället,',
        'den anställdas namn och personnummer eller anställningsnummer,',
        'vilken period det gäller, till exempel datum, veckonummer eller kalendermånad,',
        'jourtid, allmän övertid, extra övertid, allmän mertid och nödfallsövertid eller nödfallsmertid, var för sig.',
      ],
    },
    {
      h2: 'Hur länge ska tidrapporten sparas?',
      body: [
        `Anteckningarna om jourtid, övertid och mertid ska finnas på arbetsstället under det kalenderår de gäller och de två följande kalenderåren ([AFS 2023:2, 9 kap. 6 §](${afs})).`,
        `Används tidrapporten som underlag för lönen kan den också vara räkenskapsinformation, alltså uppgifter som behövs för att förstå bokföringen (bokföringslagen 1 kap. 2 §). Enligt [bokföringslagen 7 kap. 2 §](${bfl}) ska räkenskapsinformation sparas till och med det sjunde året efter utgången av det kalenderår då räkenskapsåret avslutades.`,
      ],
    },
    {
      h2: 'Måste man tidrapportera varje vecka?',
      body: [
        `Nej, arbetstidslagen och AFS 2023:2 säger inget om hur ofta ordinarie timmar ska rapporteras. Jourtid, allmän övertid och allmän mertid bör däremot antecknas så snart de uppstår och ska antecknas senast 14 dagar efter beräkningsperioden ([AFS 2023:2, 9 kap. 8 och 9 §§](${afs})). Hur ofta de anställda lämnar tidrapport styrs av arbetsgivarens rutin och ibland av kollektivavtalet. Det vanligaste är att timmarna förs in dag för dag eller vecka för vecka och stängs när månaden är slut. Kolla ert kollektivavtal.`,
      ],
    },
    {
      h2: 'Fyra sätt att föra tidrapport',
      body: ['Vilket sätt som passar beror mest på vem som för in timmarna och hur många ni är.'],
      list: [
        'Papper eller kalkylark: gratis och enkelt för ett par personer. Svårt att se vem som ändrat vad, och den anställda ser sällan samma version som arbetsgivaren. Det finns en [gratis mall för tidrapport](page:template) i Excel och PDF.',
        'Stämpelklocka: de anställda stämplar in och ut på plats. Passar när tiderna varierar mycket och många jobbar samtidigt, men kräver utrustning eller en app för varje person.',
        'App där den anställda rapporterar: var och en för in sina egna timmar och arbetsgivaren godkänner. Passar när de anställda jobbar på olika platser.',
        'App där arbetsgivaren loggar: arbetsgivaren för in timmarna och de anställda ser dem direkt. Passar ett litet ställe där ägaren vet vem som jobbade. Det är så [en app där arbetsgivaren loggar](page:small-business) som Klokka fungerar.',
      ],
    },
    {
      h2: 'En enkel rutin för månadsslutet',
      body: ['Oavsett verktyg gör de här fem stegen månadsslutet lugnare för båda sidor.'],
      list: [
        'För in timmarna dag för dag eller vecka för vecka, inte allt i efterhand.',
        'Låt den anställda se timmarna så snart de är införda.',
        'Reda ut invändningar innan månaden stängs, och anteckna vad ni kom fram till.',
        'Lås månaden när båda är överens, så att inget ändras i efterhand.',
        'Skicka underlaget till den som sköter lönen, och spara det.',
      ],
    },
    {
      h2: 'Tidrapport för deltid och timanställda',
      body: [
        'För den som jobbar deltid räknas timmar utöver den avtalade arbetstiden som [mertid](page:guide-working-hours-act), och mertid ska antecknas precis som övertid. För timanställda är tidrapporten dessutom hela underlaget för lönen, så varje dag behöver finnas med. Undrar du vad som händer om timmarna ändras i efterhand? Läs [får arbetsgivaren ändra tidrapporten?](page:guide-change)',
      ],
    },
  ],
  faq: [
    {
      q: 'Vad innebär tidrapportering?',
      a: 'Att föra in och stämma av hur många timmar någon har arbetat, dag för dag, så att lönen och eventuell övertid blir rätt. Det kan göras av den anställda själv eller av arbetsgivaren.',
    },
    {
      q: 'Hur rapporterar jag arbetstid?',
      a: 'Det beror på arbetsgivarens system: på papper, i ett kalkylark, med en stämpelklocka eller i en app. I Klokka är det arbetsgivaren som för in timmarna, och den anställda ser dem i mobilen och kan flagga en post som är fel.',
    },
    {
      q: 'Måste man tidrapportera varje vecka?',
      a: 'Arbetstidslagen och AFS 2023:2 säger inget om hur ofta ordinarie timmar ska rapporteras. Arbetsgivaren ska däremot anteckna jourtid, allmän övertid och allmän mertid senast 14 dagar efter beräkningsperioden. Rutinen bestäms av arbetsgivaren och ibland av kollektivavtalet.',
    },
    {
      q: 'Hur länge ska tidrapporter sparas?',
      a: 'Anteckningar om jourtid, övertid och mertid sparas det kalenderår de gäller och två år till. Är tidrapporten räkenskapsinformation gäller bokföringslagen: till och med det sjunde året efter utgången av det kalenderår då räkenskapsåret avslutades.',
    },
    {
      q: 'Vad händer om man inte tidrapporterar?',
      a: 'För den anställda blir det svårare att visa vilka timmar lönen ska betalas för. För arbetsgivaren är anteckningar om jourtid, övertid och mertid ett krav i arbetstidslagen (11 §), Arbetsmiljöverket har tillsyn över att lagen följs, och den som uppsåtligen eller av oaktsamhet inte för anteckningarna kan dömas till böter (24 §).',
    },
  ],
  cta: {
    title: 'Prova Klokka för nästa månad.',
    body: 'Du för in timmarna, de anställda ser dem direkt och månaden låses när ni är överens. Gratis att använda.',
    button: 'Skapa ditt företag',
  },
  author: 'Klokka',
  reviewed: '2026-09-30',
  sources: [
    { label: 'Arbetstidslag (1982:673), riksdagen.se', url: atl },
    { label: 'AFS 2023:2, kapitel 9, Arbetsmiljöverket', url: afs },
    { label: 'Anteckna uppgifter om jourtid, övertid och mertid, av.se', url: avRecords },
    { label: 'Bokföringslag (1999:1078), 7 kap. 2 §, riksdagen.se', url: bfl },
  ],
} as const satisfies GuideCopy;

export const en: PageCopyOf<typeof sv> = {
  meta: {
    title: 'How to track employee hours: a practical guide',
    description:
      'How to track employee hours in Sweden: what a timesheet should contain, what the law asks employers to record, how long to keep it, a month-end routine.',
    ogAlt: 'Guide: how to track employee hours.',
  },
  card: { eyebrow: 'Guide', title: 'How to track employee hours' },
  breadcrumb: 'Guide: tracking hours',
  h1: 'How to track employee hours',
  lede: [
    'An hours record, or timesheet, lists how many hours an employee worked, day by day, and it is the basis for pay whenever pay depends on time worked. This guide covers what a timesheet usually contains, what Swedish law asks an employer to record, and a simple month-end routine.',
  ],
  sections: [
    {
      h2: 'What is a timesheet?',
      body: [
        'A timesheet shows which days a person worked and for how many hours, often with start and end times, breaks and a comment. For hourly and part-time staff it is the basis for pay. For full-time staff on a fixed monthly salary it is mostly used to keep track of overtime, absence and flexitime.',
        'Tracking hours is the work of recording and checking them, every day, week or month. It can be done on paper, in a spreadsheet or in an app, and either by the employee or by the employer.',
      ],
    },
    {
      h2: 'What a timesheet usually contains',
      body: [
        `There are no requirements on exactly how the records must look, writes [the Work Environment Authority](${avRecords}) (in Swedish), but most timesheets contain the same parts. The clearer they are, the fewer questions come up on payday. To work out the hours from start and end times with a break, use the [work hours calculator](page:calculator).`,
      ],
      list: [
        "The business's and the employee's names, and the period the timesheet covers.",
        'The date of each working day.',
        'Start and end times, or the number of hours worked.',
        'Breaks that do not count as working time.',
        'Overtime and additional hours, separately, when there are any.',
        'On-call time, when there is any.',
        'Absence, such as sickness or holiday.',
        'A note when something is out of the ordinary, and a way to show that both sides have approved it.',
      ],
    },
    {
      h2: 'What Swedish law asks of the employer',
      body: [
        `Under [section 11 of the Working Hours Act](${atl}) (arbetstidslagen), the employer must keep records of on-call time (jourtid), overtime (övertid) and additional hours worked by part-time staff (mertid). Employees have the right to see the records, themselves or through someone else, and so do unions that represent employees at the workplace.`,
        `So the law expressly asks for records of on-call time, overtime and additional hours, not of every ordinary hour. [The Work Environment Authority](${avRecords}) (in Swedish) still writes that all employers must keep track of both ordinary working time and the time beyond it. In practice, overtime and additional hours can only be worked out if you know how much someone worked in total, and for [hourly staff](page:hourly) the hours are the basis for pay. That is why most employers record every hour.`,
        `What the records must look like is set out in the Swedish Work Environment Authority's regulations, [AFS 2023:2 chapter 9](${afs}). The employer decides in which document they are kept, on paper or on a computer, but they must be clear and well laid out and include:`,
      ],
      list: [
        "the employer's name and the workplace,",
        "the employee's name and personal identity number or employee number,",
        'the period covered, for example dates, a week number or a calendar month,',
        'on-call time, general overtime, extra overtime, general additional hours and emergency overtime or additional hours, each kept apart.',
      ],
    },
    {
      h2: 'How long should timesheets be kept in Sweden?',
      body: [
        `The records of on-call time, overtime and additional hours must be kept at the workplace for the calendar year they cover and the two following calendar years ([AFS 2023:2, chapter 9, section 6](${afs})).`,
        `When a timesheet is used as the basis for pay, it may also count as accounting records, meaning information needed to follow the bookkeeping (Bookkeeping Act, chapter 1, section 2). Under [chapter 7, section 2 of the Swedish Bookkeeping Act](${bfl}), accounting records are kept until the end of the seventh year after the calendar year in which the financial year ended.`,
      ],
    },
    {
      h2: 'Do hours have to be reported every week?',
      body: [
        `No, neither the Working Hours Act nor AFS 2023:2 says how often ordinary hours must be reported. On-call time, general overtime and general additional hours, however, should be recorded as soon as they arise and must be recorded at the latest 14 days after the calculation period ([AFS 2023:2, chapter 9, sections 8 and 9](${afs})). How often staff hand in their hours is set by the employer's routine and sometimes by the collective agreement. Most commonly the hours are recorded day by day or week by week and closed at the end of the month. Check your collective agreement.`,
      ],
    },
    {
      h2: 'Four ways to track employee hours',
      body: ['Which way fits depends mostly on who records the hours and how many of you there are.'],
      list: [
        'Paper or a spreadsheet: free and simple for a couple of people. Hard to see who changed what, and the employee rarely sees the same version as the employer. There is a [free timesheet template](page:template) in Excel and PDF.',
        'A time clock: staff clock in and out on site. Fits when hours vary a lot and many work at once, but needs equipment or an app for each person.',
        'An app where the employee reports: everyone logs their own hours and the employer approves. Fits when staff work in different places.',
        'An app where the employer logs: the employer records the hours and staff see them straight away. Fits a small place where the owner knows who worked. That is how Klokka works, as [an app where the employer logs](page:small-business).',
      ],
    },
    {
      h2: 'A simple month-end routine',
      body: ['Whatever the tool, these five steps make the end of the month calmer for both sides.'],
      list: [
        'Record the hours day by day or week by week, not all at the end.',
        'Let the employee see the hours as soon as they are recorded.',
        'Sort out objections before the month is closed, and note what you agreed.',
        'Lock the month once both agree, so nothing changes afterwards.',
        'Send the records to whoever runs payroll, and keep them.',
      ],
    },
    {
      h2: 'Timesheets for part-time and hourly staff',
      body: [
        'For part-time staff, hours beyond the contracted hours count as [additional hours](page:guide-working-hours-act) (mertid), and they must be recorded just like overtime. For hourly staff the timesheet is also the whole basis for pay, so every day needs to be in it. Wondering what happens if the hours are changed afterwards? Read [can an employer change your timesheet?](page:guide-change)',
      ],
    },
  ],
  faq: [
    {
      q: 'What is a timesheet?',
      a: 'A record of how many hours someone worked, day by day, so that pay and any overtime come out right. It can be kept by the employee or by the employer.',
    },
    {
      q: 'How do I record working hours?',
      a: "It depends on the employer's system: on paper, in a spreadsheet, with a time clock or in an app. In Klokka the employer logs the hours, and the employee sees them on their phone and can flag an entry that is wrong.",
    },
    {
      q: 'Do hours have to be reported every week?',
      a: 'Neither the Working Hours Act nor AFS 2023:2 says how often ordinary hours must be reported. The employer must, however, record on-call time, general overtime and general additional hours at the latest 14 days after the calculation period. The routine is set by the employer and sometimes by the collective agreement.',
    },
    {
      q: 'How long should timesheets be kept in Sweden?',
      a: 'Records of on-call time, overtime and additional hours are kept for the calendar year they cover plus two more. When the timesheet counts as accounting records, the Bookkeeping Act applies: until the end of the seventh year after the calendar year in which the financial year ended.',
    },
    {
      q: 'What happens if hours are not recorded?',
      a: 'For the employee, it gets harder to show which hours should be paid. For the employer, records of on-call time, overtime and additional hours are required by the Working Hours Act (section 11), the Swedish Work Environment Authority supervises that the law is followed, and an employer who intentionally or negligently fails to keep the records can be fined (section 24).',
    },
  ],
  cta: {
    title: 'Try Klokka for next month.',
    body: 'You log the hours, your staff see them straight away, and the month is locked once you agree. Free to use.',
    button: 'Create your business',
  },
  author: 'Klokka',
  reviewed: '2026-09-30',
  sources: [
    { label: 'Working Hours Act (1982:673), riksdagen.se (Swedish)', url: atl },
    { label: 'AFS 2023:2, chapter 9, Swedish Work Environment Authority (Swedish)', url: afs },
    { label: 'Recording on-call time, overtime and additional hours, av.se (Swedish)', url: avRecords },
    { label: 'Bookkeeping Act (1999:1078), chapter 7 section 2, riksdagen.se (Swedish)', url: bfl },
  ],
};
