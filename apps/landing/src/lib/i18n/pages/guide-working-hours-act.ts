import type { GuideCopy, PageCopyOf } from './types';

// Fact check 2026-09-30 (CHQ-149), every statement against the primary text: arbetstidslagen as in force (t.o.m.
// SFS 2022:450) on riksdagen.se, 2, 3, 5, 7, 8, 8 a, 10, 10 a, 10 b, 11, 13, 13 a, 14, 15, 16, 17, 20, 22, 24 and 26 §§;
// AFS 2023:2 kap. 9 (3 to 9 §§); av.se "Om arbetstidslagen" (raster räknas inte in i arbetstiden) and the av.se page on
// records; the CJEU press release on C-55/18. No official source states Sweden's implementation status of C-55/18, so
// the page says only what the law text shows: neither arbetstidslagen nor AFS 2023:2 has a general duty to record all
// hours. Plain and neutral: each rule is stated with its section, no advice.
const atl =
  'https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/arbetstidslag-1982673_sfs-1982-673/';
const afs =
  'https://www.av.se/globalassets/filer/publikationer/foreskrifter/planering-och-organisering-av-arbetsmiljoarbete-grundlaggande-skyldigheter-for-dig-med-arbetsgivaransvar-afs2023-2.pdf';
const avRecords =
  'https://www.av.se/arbetsmiljoarbete-och-inspektioner/arbetsgivarens-ansvar-for-arbetsmiljon/anteckna-uppgifter-om-jourtid-overtid-och-mertid/';
const avAtl =
  'https://www.av.se/arbetsmiljoarbete-och-inspektioner/lagar-och-regler-om-arbetsmiljo/om-arbetstidslagen/';
const curia = 'https://curia.europa.eu/jcms/upload/docs/application/pdf/2019-05/cp190061en.pdf';

export const sv = {
  meta: {
    title: 'Arbetstidslagen för arbetsgivare: så dokumenterar du tiden',
    description:
      'Vad arbetstidslagen kräver av dig som arbetsgivare: övertid, vila och dokumentation av arbetstid. Kort och konkret, med länkar till lagtexten.',
    ogAlt: 'Guide: arbetstidslagen för arbetsgivare.',
  },
  card: { eyebrow: 'Guide', title: 'Arbetstidslagen för arbetsgivare' },
  breadcrumb: 'Guide: arbetstidslagen',
  h1: 'Arbetstidslagen för arbetsgivare',
  lede: [
    'Arbetstidslagen (1982:673) sätter ramarna för hur mycket en anställd får arbeta: ordinarie arbetstid på högst 40 timmar i veckan, ett tak för övertid och mertid, och krav på dygnsvila, veckovila och raster. Som arbetsgivare ska du också föra anteckningar om jourtid, övertid och mertid, och de anställda har rätt att ta del av dem.',
    `Guiden går igenom reglerna en i taget, med paragrafen och en länk till [lagtexten på riksdagen.se](${atl}). Många av reglerna kan ersättas av kollektivavtal, så har ni ett avtal är det där du börjar.`,
  ],
  sections: [
    {
      h2: 'Kort om lagen',
      body: [
        'Arbetstidslagen gäller för de flesta anställda, också timanställda och deltidsanställda. Den gäller inte, bland annat, för arbete i arbetsgivarens hushåll och för arbetstagare med företagsledande ställning (2 §).',
        'Stora delar av lagen får ersättas av kollektivavtal (3 §). Därför skiljer sig reglerna ofta mellan branscher, och siffrorna nedan är lagens utgångspunkt. Kolla ert kollektivavtal.',
      ],
    },
    {
      h2: 'Ordinarie arbetstid',
      body: [
        'Den ordinarie arbetstiden får vara högst 40 timmar i veckan (5 §). När arbetets natur eller arbetsförhållandena kräver det får den i stället vara 40 timmar i veckan i genomsnitt under högst fyra veckor. En heltid blir alltså 8 timmar om dagen, fem dagar i veckan. Hur många timmar det blir en viss månad står i [arbetstid per månad](page:hours).',
      ],
    },
    {
      h2: 'Övertid och mertid',
      body: [
        'Övertid är arbetstid utöver den ordinarie arbetstiden och jourtiden (7 §). Mertid är arbetstid som en deltidsanställd arbetar utöver sin ordinarie arbetstid och jourtid enligt anställningsavtalet (10 §). Lagen sätter de här gränserna, och kollektivavtal kan ha andra:',
      ],
      list: [
        'Allmän övertid: högst 48 timmar under en period om fyra veckor, eller 50 timmar under en kalendermånad, och högst 200 timmar under ett kalenderår (8 §).',
        'Extra övertid: om det finns särskilda skäl och situationen inte har gått att lösa på annat rimligt sätt, högst 150 timmar till per kalenderår, men fortfarande inom 48 timmar per fyra veckor eller 50 timmar per kalendermånad (8 a §).',
        'Allmän mertid: högst 200 timmar per kalenderår (10 §). Extra mertid vid särskilda skäl: högst 150 timmar per kalenderår, med samma tak per fyra veckor eller kalendermånad (10 a §).',
        'Den sammanlagda arbetstiden, övertid och mertid inräknade, får vara högst 48 timmar per sjudagarsperiod i genomsnitt under en period om högst fyra månader (10 b §).',
      ],
    },
    {
      h2: 'Dygnsvila och veckovila',
      body: [
        'Alla anställda ska ha minst 11 timmars sammanhängande ledighet under varje period om 24 timmar, och den ska som huvudregel omfatta tiden mellan midnatt och klockan 05 (13 §). Varje period om sju dagar ska ha minst 36 timmars sammanhängande ledighet (14 §). Kolla ert kollektivavtal, det kan ha andra regler.',
      ],
    },
    {
      h2: 'Raster och pauser',
      body: [
        `Rasterna ska läggas så att ingen arbetar mer än fem timmar i följd (15 §). En rast är ett avbrott i den dagliga arbetstiden då den anställda inte är skyldig att stanna kvar på arbetsstället (15 §), och raster räknas inte in i arbetstiden, skriver [Arbetsmiljöverket](${avAtl}). Byts rasten ut mot ett måltidsuppehåll vid arbetsplatsen räknas uppehållet däremot in i arbetstiden (16 §), och det gör även pauser, korta avbrott i arbetet (17 §).`,
        'Behöver du räkna ut ett pass med rast finns en [kalkylator för arbetstid](page:calculator).',
      ],
    },
    {
      h2: 'Nattarbete',
      body: [
        'För nattarbetande får arbetstiden inte vara mer än åtta timmar per 24 timmar i genomsnitt under en beräkningsperiod om högst fyra månader (13 a §). Nattarbetande är den som normalt arbetar minst tre timmar av sitt pass under natten, mellan klockan 22 och 06, eller troligen kommer att arbeta minst en tredjedel av sin årsarbetstid på natten. Kollektivavtal kan ha andra regler.',
      ],
    },
    {
      h2: 'Anteckningar om arbetstid: vad du ska dokumentera',
      body: [
        `Enligt [11 §](${atl}) ska arbetsgivaren föra anteckningar om jourtid, övertid och mertid. De anställda har rätt att ta del av dem, själva eller genom någon annan, och samma rätt har facket på arbetsstället.`,
        `Hur anteckningarna ska föras står i Arbetsmiljöverkets föreskrifter, [AFS 2023:2 kapitel 9](${afs}), som [av.se sammanfattar](${avRecords}):`,
      ],
      list: [
        'Anteckningar för varje anställd, tydliga och överskådliga. Arbetsgivaren bestämmer i vilken handling de görs (9 kap. 3 §), och enligt Arbetsmiljöverket går det bra på papper eller i datorn.',
        'Arbetsgivarens namn, arbetsstället, den anställdas namn och personnummer eller anställningsnummer, och vilken period det gäller (9 kap. 4 §).',
        'Jourtid, allmän övertid, extra övertid, allmän mertid och nödfallsövertid eller nödfallsmertid hålls isär, till exempel i var sin kolumn (9 kap. 5 §).',
        'Jourtid, allmän övertid och allmän mertid bör antecknas så snart de uppstår och ska antecknas senast 14 dagar efter beräkningsperioden (9 kap. 8 och 9 §§).',
        'Anteckningarna sparas på arbetsstället det kalenderår de gäller och de två följande kalenderåren (9 kap. 6 §).',
        'Lagen och arbetstidsschemat ska finnas tillgängliga på arbetsstället (9 kap. 7 §).',
      ],
    },
    {
      h2: 'Måste all arbetstid registreras?',
      body: [
        `Arbetstidslagen kräver anteckningar om jourtid, övertid och mertid (11 §). Varken lagen eller AFS 2023:2 kapitel 9 innehåller någon allmän skyldighet att registrera varje anställds ordinarie timmar. [Arbetsmiljöverket](${avRecords}) skriver ändå att alla arbetsgivare ska hålla koll på både den ordinarie arbetstiden och tiden utöver den.`,
        `EU-domstolen slog den 14 maj 2019 fast, i mål C-55/18 (CCOO mot Deutsche Bank), att medlemsstaterna ska kräva att arbetsgivare inför ett system som gör det möjligt att mäta varje arbetstagares dagliga arbetstid ([EU-domstolens pressmeddelande](${curia}), på engelska). Någon sådan allmän skyldighet finns ännu inte i arbetstidslagen eller i AFS 2023:2.`,
        'I praktiken för de flesta ändå alla timmar: för timanställda är timmarna lönen, och övertid och mertid går bara att räkna ut om man vet hur många timmar som arbetades totalt. Läs mer om [vad en tidrapport ska innehålla](page:guide-timesheet).',
      ],
    },
    {
      h2: 'Tillsyn',
      body: [
        `Arbetsmiljöverket har tillsyn över att arbetstidslagen följs (20 §) och får besluta om förelägganden och förbud (22 §). Bryter en arbetsgivare utan stöd i kollektivavtal mot bland annat reglerna om ordinarie arbetstid, övertid, mertid, dygnsvila eller veckovila ska en sanktionsavgift tas ut (26 §). En arbetsgivare som uppsåtligen eller av oaktsamhet bryter mot 11 § om anteckningar kan dömas till böter (24 §). Mer finns på [av.se](${avAtl}).`,
      ],
    },
    {
      h2: 'Så gör du det enkelt i praktiken',
      body: [
        'För in timmarna per dag, låt den anställda se dem, och stäng månaden när ni är överens. Då finns underlaget för övertid och mertid redan, och ingen behöver rekonstruera en månad i efterhand.',
        'Klokka är ett sätt att göra det: arbetsgivaren för in timmarna, den anställda ser dem och kan flagga fel, och månaden låses och exporteras. Klokka räknar inte ut övertid eller mertid, men timmarna finns där när den som sköter lönen gör det. Vill du hellre börja på papper finns en [gratis tidrapport mall](page:template). Har du [timanställda](page:hourly) gäller samma regler för dem.',
      ],
    },
  ],
  faq: [
    {
      q: 'Hur många timmar får man jobba per vecka?',
      a: 'Högst 40 timmar ordinarie arbetstid (5 §). Med övertid och mertid får den sammanlagda arbetstiden vara högst 48 timmar per sjudagarsperiod i genomsnitt under en period om högst fyra månader (10 b §). Kollektivavtal kan ha andra regler.',
    },
    {
      q: 'Hur mycket övertid får man jobba?',
      a: 'Allmän övertid högst 48 timmar per fyra veckor eller 50 timmar per kalendermånad, och högst 200 timmar per kalenderår (8 §). Vid särskilda skäl får extra övertid tas ut med högst 150 timmar till per år (8 a §).',
    },
    {
      q: 'Gäller arbetstidslagen för timanställda?',
      a: 'Ja. Det finns inget särskilt tak för timanställda, samma regler gäller som för andra anställda. Läs mer om [tidrapport för timanställda](page:hourly).',
    },
    {
      q: 'Måste arbetsgivaren dokumentera arbetstiden?',
      a: 'Jourtid, övertid och mertid ska antecknas (11 §), och de anställda har rätt att se anteckningarna. Någon allmän skyldighet att registrera all arbetstid finns inte i arbetstidslagen eller AFS 2023:2 i dag, trots EU-domstolens dom från 2019.',
    },
    {
      q: 'Vem kontrollerar att arbetstidslagen följs?',
      a: 'Arbetsmiljöverket (20 §). Verket får besluta om förelägganden och förbud (22 §) och, för flera av reglerna, ta ut en sanktionsavgift (26 och 27 §§).',
    },
    {
      q: 'Räknas rasten som arbetstid?',
      a: 'Nej. En rast är ett avbrott då den anställda inte är skyldig att stanna kvar på arbetsstället (15 §), och Arbetsmiljöverket skriver att raster inte räknas in i arbetstiden. Pauser och måltidsuppehåll räknas däremot in (16 och 17 §§).',
    },
  ],
  cta: {
    title: 'Håll koll på timmarna i Klokka.',
    body: 'Timmarna per dag, synliga för både dig och de anställda, och en månad som låses när ni är överens. Gratis att använda.',
    button: 'Skapa ditt företag',
  },
  author: 'Klokka',
  reviewed: '2026-09-30',
  sources: [
    { label: 'Arbetstidslag (1982:673), riksdagen.se', url: atl },
    { label: 'AFS 2023:2, kapitel 9, Arbetsmiljöverket', url: afs },
    { label: 'Anteckna uppgifter om jourtid, övertid och mertid, av.se', url: avRecords },
    { label: 'Om arbetstidslagen, av.se', url: avAtl },
    { label: 'EU-domstolens pressmeddelande 61/19 om mål C-55/18, curia.europa.eu (engelska)', url: curia },
  ],
} as const satisfies GuideCopy;

export const en: PageCopyOf<typeof sv> = {
  meta: {
    title: 'Swedish Working Hours Act for employers, in plain words',
    description:
      'What the Swedish Working Hours Act asks of employers: overtime, rest and recording hours. Short and concrete, with links to the law.',
    ogAlt: "Guide: Sweden's Working Hours Act for employers.",
  },
  card: { eyebrow: 'Guide', title: "Sweden's Working Hours Act" },
  breadcrumb: 'Guide: Working Hours Act',
  h1: 'The Swedish Working Hours Act for employers',
  lede: [
    'The Swedish Working Hours Act (1982:673) sets the limits on how much an employee may work: ordinary hours of at most 40 a week, a cap on overtime and additional hours, and rules on daily rest, weekly rest and breaks. Employers must also keep records of on-call time, overtime and additional hours, and employees have the right to see them.',
    `This guide goes through the rules one at a time, with the section and a link to [the law text on riksdagen.se](${atl}) (in Swedish). Many of the rules can be replaced by a collective agreement, so if you have one, start there.`,
  ],
  sections: [
    {
      h2: 'The Act in brief',
      body: [
        "The Working Hours Act (arbetstidslagen) covers most employees, including hourly and part-time staff. Among other things, it does not cover work in the employer's household or employees in a company-management position (section 2).",
        'Large parts of the Act may be replaced by collective agreements (section 3). That is why the rules often differ between trades, and the numbers below are where the Act starts. Check your collective agreement.',
      ],
    },
    {
      h2: 'Ordinary working hours',
      body: [
        'Ordinary working time may be at most 40 hours a week (section 5). Where the nature of the work or the working conditions require it, it may instead be 40 hours a week on average over at most four weeks. Full time is therefore 8 hours a day, five days a week. How many hours that makes in a given month is in [working hours per month](page:hours).',
      ],
    },
    {
      h2: 'Overtime and additional hours',
      body: [
        'Overtime is working time beyond ordinary working hours and on-call time (section 7). Additional hours (mertid) are hours a part-time employee works beyond their ordinary hours and on-call time under the employment contract (section 10). The Act sets these limits, and collective agreements may set others:',
      ],
      list: [
        'General overtime: at most 48 hours over a four-week period, or 50 hours in a calendar month, and at most 200 hours in a calendar year (section 8).',
        'Extra overtime: if there are special reasons and the situation could not reasonably be solved another way, at most 150 more hours per calendar year, still within 48 hours per four weeks or 50 hours per calendar month (section 8 a).',
        'General additional hours: at most 200 per calendar year (section 10). Extra additional hours for special reasons: at most 150 per calendar year, with the same cap per four weeks or calendar month (section 10 a).',
        'Total working time, overtime and additional hours included, may be at most 48 hours per seven-day period on average over a period of at most four months (section 10 b).',
      ],
    },
    {
      h2: 'Daily and weekly rest',
      body: [
        'Every employee must have at least 11 consecutive hours off in every 24-hour period, and as a rule it must include the time between midnight and 5 am (section 13). Every seven-day period must include at least 36 consecutive hours off (section 14). Check your collective agreement, it may have other rules.',
      ],
    },
    {
      h2: 'Breaks and pauses',
      body: [
        `Breaks must be placed so that no one works more than five hours in a row (section 15). A break (rast) is a stop in the daily working time when the employee is not obliged to stay at the workplace (section 15), and breaks are not counted as working time, according to [the Work Environment Authority](${avAtl}) (in Swedish). If a break is replaced by a meal pause at the workplace, that pause does count as working time (section 16), and so do pauses, short stops in the work (section 17).`,
        'If you need to work out a shift with a break, there is a [work hours calculator](page:calculator).',
      ],
    },
    {
      h2: 'Night work',
      body: [
        'For night workers, working time may not exceed eight hours per 24 hours on average over a calculation period of at most four months (section 13 a). A night worker is someone who normally works at least three hours of their shift at night, between 10 pm and 6 am, or is likely to work at least a third of their annual working time then. Collective agreements may have other rules.',
      ],
    },
    {
      h2: 'Keeping records of working time',
      body: [
        `Under [section 11](${atl}), the employer must keep records of on-call time, overtime and additional hours. Employees have the right to see them, themselves or through someone else, and so does the union at the workplace.`,
        `How the records are kept is set out in the Swedish Work Environment Authority's regulations, [AFS 2023:2 chapter 9](${afs}), summarised on [av.se](${avRecords}) (both in Swedish):`,
      ],
      list: [
        'Records for each employee, clear and well laid out. The employer decides in which document they are kept (chapter 9, section 3), and according to the Work Environment Authority paper or a computer are both fine.',
        "The employer's name, the workplace, the employee's name and personal identity number or employee number, and the period covered (chapter 9, section 4).",
        'On-call time, general overtime, extra overtime, general additional hours and emergency overtime or additional hours are kept apart, for example in separate columns (chapter 9, section 5).',
        'On-call time, general overtime and general additional hours should be recorded as they arise and must be recorded at the latest 14 days after the calculation period (chapter 9, sections 8 and 9).',
        'The records are kept at the workplace for the calendar year they cover and the two following calendar years (chapter 9, section 6).',
        'The Act and the working-time schedule must be available at the workplace (chapter 9, section 7).',
      ],
    },
    {
      h2: 'Do all hours have to be recorded?',
      body: [
        `The Act requires records of on-call time, overtime and additional hours (section 11). Neither the Act nor AFS 2023:2 chapter 9 contains a general duty to record every employee's ordinary hours. [The Work Environment Authority](${avRecords}) (in Swedish) still writes that all employers must keep track of both ordinary working time and the time beyond it.`,
        `On 14 May 2019 the EU Court of Justice ruled, in case C-55/18 (CCOO v Deutsche Bank), that member states must require employers to set up a system enabling each worker's daily working time to be measured ([the Court's press release](${curia})). No such general duty is yet found in the Working Hours Act or in AFS 2023:2.`,
        'In practice most employers record all hours anyway: for hourly staff the hours are the pay, and overtime and additional hours can only be worked out if you know how many hours were worked in total. Read more about [how to track employee hours](page:guide-timesheet).',
      ],
    },
    {
      h2: 'Supervision',
      body: [
        `The Swedish Work Environment Authority (Arbetsmiljöverket) supervises that the Working Hours Act is followed (section 20) and may issue injunctions and prohibitions (section 22). If an employer breaks, without support in a collective agreement, among others the rules on ordinary hours, overtime, additional hours, daily rest or weekly rest, a penalty fee (sanktionsavgift) is charged (section 26). An employer who intentionally or negligently breaks section 11 on records can be fined (section 24). There is more on [av.se](${avAtl}) (in Swedish).`,
      ],
    },
    {
      h2: 'Making it simple in practice',
      body: [
        'Log the hours per day, let the employee see them, and close the month once you agree. Then the basis for overtime and additional hours is already there, and nobody has to reconstruct a month afterwards.',
        'Klokka is one way to do that: the employer logs the hours, the employee sees them and can flag mistakes, and the month is locked and exported. Klokka does not calculate overtime or additional hours, but the hours are there when whoever runs payroll does. If you would rather start on paper, there is a [free timesheet template](page:template). If you have [hourly employees](page:hourly), the same rules apply to them.',
      ],
    },
  ],
  faq: [
    {
      q: 'How many hours a week can you work in Sweden?',
      a: 'At most 40 hours of ordinary working time (section 5). With overtime and additional hours, total working time may be at most 48 hours per seven-day period on average over a period of at most four months (section 10 b). Collective agreements may have other rules.',
    },
    {
      q: 'How much overtime is allowed in Sweden?',
      a: 'General overtime at most 48 hours per four weeks or 50 hours per calendar month, and at most 200 hours per calendar year (section 8). For special reasons, extra overtime of at most 150 more hours a year may be worked (section 8 a).',
    },
    {
      q: 'Does the Working Hours Act apply to hourly employees?',
      a: 'Yes. There is no separate cap for hourly staff, the same rules apply as for other employees. Read more about [hours tracking for hourly employees](page:hourly).',
    },
    {
      q: 'Must the employer record working hours?',
      a: 'On-call time, overtime and additional hours must be recorded (section 11), and employees have the right to see the records. There is no general duty in the Working Hours Act or AFS 2023:2 today to record all working time, despite the 2019 ruling of the EU Court of Justice.',
    },
    {
      q: 'Who checks that the Working Hours Act is followed?',
      a: 'The Swedish Work Environment Authority (section 20). It may issue injunctions and prohibitions (section 22) and, for several of the rules, charge a penalty fee (sections 26 and 27).',
    },
    {
      q: 'Does a break count as working time?',
      a: 'No. A break is a stop when the employee is not obliged to stay at the workplace (section 15), and the Work Environment Authority writes that breaks are not counted as working time. Pauses and meal pauses, however, do count (sections 16 and 17).',
    },
  ],
  cta: {
    title: 'Keep the hours in Klokka.',
    body: 'The hours per day, visible to both you and your staff, and a month that is locked once you agree. Free to use.',
    button: 'Create your business',
  },
  author: 'Klokka',
  reviewed: '2026-09-30',
  sources: [
    { label: 'Working Hours Act (1982:673), riksdagen.se (Swedish)', url: atl },
    { label: 'AFS 2023:2, chapter 9, Swedish Work Environment Authority (Swedish)', url: afs },
    { label: 'Recording on-call time, overtime and additional hours, av.se (Swedish)', url: avRecords },
    { label: 'About the Working Hours Act, av.se (Swedish)', url: avAtl },
    { label: 'Court of Justice press release 61/19 on case C-55/18, curia.europa.eu', url: curia },
  ],
};
