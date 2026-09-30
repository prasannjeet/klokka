import { HOURS_PER_DAY, isWeekend, monthTable, swedishHolidays, yearTotals } from '@/lib/workdays';
import type { Locale } from '../config';
import type { PageCopyOf, TableCopy } from './types';

// The hub of the working-hours tables, plus what the hub and the year pages share: the table labels, the holiday
// names and the numbers the copy quotes. Every number in the copy is worked out from lib/workdays.ts at build
// time, never typed, so a year's text cannot disagree with its table.

const numberLocale: Record<Locale, string> = { sv: 'sv-SE', en: 'en-GB' };

/** A count as each language writes it: 2 008 in Swedish, 2,008 in English. */
export function num(value: number, locale: Locale): string {
  return new Intl.NumberFormat(numberLocale[locale]).format(value);
}

/** Month names in running text ('maj och juli' / 'May and July'), January is 1. */
export function monthList(months: readonly number[], locale: Locale): string {
  const names = months.map((m) => {
    const name = (locale === 'sv' ? tableSv : tableEn).monthNames[m - 1]!;
    return locale === 'sv' ? name.toLowerCase() : name;
  });
  return new Intl.ListFormat(numberLocale[locale], { type: 'conjunction' }).format(names);
}

/** The text with its first letter in upper case, for a generated phrase that starts a sentence. */
export function capitalized(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** The figures a year's copy quotes; hours are full time on the working days in practice. */
export function yearFacts(year: number) {
  const rows = monthTable(year);
  const { legalDays, practiceDays } = yearTotals(year);
  const days = rows.map((r) => r.practiceDays);
  const fewest = Math.min(...days);
  const most = Math.max(...days);
  return {
    legalDays,
    practiceDays,
    legalHours: legalDays * HOURS_PER_DAY,
    practiceHours: practiceDays * HOURS_PER_DAY,
    avgHours: Math.round((practiceDays * HOURS_PER_DAY) / 12),
    minHours: fewest * HOURS_PER_DAY,
    maxHours: most * HOURS_PER_DAY,
    fewestDays: fewest,
    mostDays: most,
    shortestMonths: rows.filter((r) => r.practiceDays === fewest).map((r) => r.month),
    longestMonths: rows.filter((r) => r.practiceDays === most).map((r) => r.month),
    publicOnWeekdays: swedishHolidays(year).filter((h) => h.kind === 'public' && !isWeekend(h.date)).length,
    month: (m: number) => rows[m - 1]!,
  };
}

const helgdagslagen =
  'https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/lag-1989253-om-allmanna-helgdagar_sfs-1989-253/';

/** Labels shared by the hub and the year pages. */
export const tableSv = {
  columns: {
    caption: 'Arbetsdagar och arbetstimmar per månad {year}',
    month: 'Månad',
    days: 'Arbetsdagar',
    legal: 'Enligt lag',
    practice: 'I praktiken',
    hours: 'Timmar i praktiken',
    fullTime: 'Heltid',
    part75: 'Deltid 75 %',
    part50: 'Deltid 50 %',
    total: 'Hela året',
    tableNote:
      'Timmarna räknas på arbetsdagarna i praktiken, 8 timmar per dag. Räknas midsommarafton, julafton och nyårsafton som arbetsdagar blir heltiden {legalHours} timmar för året.',
    about:
      'Tabellen kommer från Klokka. Klokka är gratis att använda och har öppen källkod under MIT-licens. Det finns ingen gräns för antalet anställda, och Klokka fungerar på webben och i Android-appen, på svenska och engelska.',
    holidaysTitle: 'Röda dagar och aftnar {year}',
    holidaysIntro:
      'De allmänna helgdagarna enligt lagen om allmänna helgdagar, och de tre aftnar som de flesta arbetsplatser har lediga. En helgdag som infaller på en lördag eller söndag ger ingen extra ledig vardag.',
    kindPublic: 'Röd dag',
    kindEve: 'Afton, inte röd dag enligt lag',
    onWeekend: 'Infaller på helgen',
    bridgeTitle: 'Klämdagar {year}',
    bridgeIntro:
      'En klämdag är en vardag mellan en ledig dag och helgen. Den är ingen helgdag, och tabellen räknar den som en vanlig arbetsdag, men med en dags ledighet blir det fyra lediga dagar i rad. Klämdagarna {year}:',
    bridgeNone: '{year} har inga klämdagar.',
    summaryCaption: 'Arbetsdagar och heltidstimmar per månad, 2026 och 2027',
    summaryHours: 'Timmar, heltid',
    summaryNote:
      'Arbetsdagar i praktiken, med midsommarafton, julafton och nyårsafton lediga. Heltid är 8 timmar per arbetsdag.',
    yearLink: 'Hela tabellen för {year}',
  },
  monthNames: [
    'Januari',
    'Februari',
    'Mars',
    'April',
    'Maj',
    'Juni',
    'Juli',
    'Augusti',
    'September',
    'Oktober',
    'November',
    'December',
  ],
  holidays: {
    newYearsDay: 'Nyårsdagen',
    epiphany: 'Trettondedag jul',
    goodFriday: 'Långfredagen',
    easterSunday: 'Påskdagen',
    easterMonday: 'Annandag påsk',
    mayDay: 'Första maj',
    ascensionDay: 'Kristi himmelsfärdsdag',
    whitSunday: 'Pingstdagen',
    nationalDay: 'Sveriges nationaldag',
    midsummerEve: 'Midsommarafton',
    midsummerDay: 'Midsommardagen',
    allSaintsDay: 'Alla helgons dag',
    christmasEve: 'Julafton',
    christmasDay: 'Juldagen',
    boxingDay: 'Annandag jul',
    newYearsEve: 'Nyårsafton',
  },
} as const;

export const tableEn: PageCopyOf<typeof tableSv> = {
  columns: {
    caption: 'Working days and working hours per month in Sweden, {year}',
    month: 'Month',
    days: 'Working days',
    legal: 'By law',
    practice: 'In practice',
    hours: 'Hours in practice',
    fullTime: 'Full time',
    part75: 'Part time 75%',
    part50: 'Part time 50%',
    total: 'Whole year',
    tableNote:
      "Hours are counted on the working days in practice, 8 hours a day. If Midsummer Eve, Christmas Eve and New Year's Eve count as working days, full time is {legalHours} hours for the year.",
    about:
      'This table comes from Klokka. Klokka is free to use and open source under the MIT licence. There is no limit on the number of employees, and it works on the web and in the Android app, in Swedish and English.',
    holidaysTitle: 'Public holidays and eves in {year}',
    holidaysIntro:
      "The public holidays under Sweden's Public Holidays Act, and the three eves most workplaces take off. A holiday that falls on a Saturday or Sunday gives no extra weekday off.",
    kindPublic: 'Public holiday',
    kindEve: 'Eve, not a public holiday by law',
    onWeekend: 'Falls on a weekend',
    bridgeTitle: 'Bridge days in {year}',
    bridgeIntro:
      'A bridge day (klämdag) is a weekday squeezed between a day off and the weekend. It is not a holiday, and the table counts it as a normal working day, but one day of leave gives four days off in a row. The bridge days in {year}:',
    bridgeNone: '{year} has no bridge days.',
    summaryCaption: 'Working days and full-time hours per month in Sweden, 2026 and 2027',
    summaryHours: 'Hours, full time',
    summaryNote:
      "Working days in practice, with Midsummer Eve, Christmas Eve and New Year's Eve off. Full time is 8 hours per working day.",
    yearLink: 'Full table for {year}',
  },
  monthNames: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
  holidays: {
    newYearsDay: "New Year's Day (nyårsdagen)",
    epiphany: 'Epiphany (trettondedag jul)',
    goodFriday: 'Good Friday (långfredagen)',
    easterSunday: 'Easter Sunday (påskdagen)',
    easterMonday: 'Easter Monday (annandag påsk)',
    mayDay: 'May Day (första maj)',
    ascensionDay: 'Ascension Day (Kristi himmelsfärdsdag)',
    whitSunday: 'Whit Sunday (pingstdagen)',
    nationalDay: 'National Day of Sweden (nationaldagen)',
    midsummerEve: 'Midsummer Eve (midsommarafton)',
    midsummerDay: 'Midsummer Day (midsommardagen)',
    allSaintsDay: "All Saints' Day (alla helgons dag)",
    christmasEve: 'Christmas Eve (julafton)',
    christmasDay: 'Christmas Day (juldagen)',
    boxingDay: 'Boxing Day (annandag jul)',
    newYearsEve: "New Year's Eve (nyårsafton)",
  },
};

const y26 = yearFacts(2026);
const y27 = yearFacts(2027);

export const sv = {
  meta: {
    title: 'Arbetstid per månad: timmar och arbetsdagar | Klokka',
    description:
      'Hur många arbetstimmar och arbetsdagar har varje månad? Tabeller för 2026 och 2027 med röda dagar inräknade, för heltid och deltid.',
    ogAlt: 'Arbetstid per månad: en tabell över arbetsdagar och timmar från Klokka.',
  },
  card: { eyebrow: 'Tabell', title: 'Arbetstid per månad' },
  breadcrumb: 'Arbetstid per månad',
  h1: 'Arbetstid per månad: timmar och arbetsdagar',
  lede: [
    'Så här många arbetsdagar och arbetstimmar har varje månad i Sverige, räknat på måndag till fredag minus röda dagar och med 8 timmar per dag vid heltid. Tabellerna räknas fram automatiskt från lagen om allmänna helgdagar, och kommer från Klokka, en gratis app med öppen källkod (MIT) för att logga de anställdas timmar, på webben och i Android-appen.',
    `2026 har ${num(y26.practiceDays, 'sv')} arbetsdagar och ${num(y26.practiceHours, 'sv')} timmar vid heltid, 2027 har ${num(y27.practiceDays, 'sv')} arbetsdagar och ${num(y27.practiceHours, 'sv')} timmar. Deltid, röda dagar och klämdagar för varje månad finns i tabellerna för [arbetstid per månad 2026](page:hours-2026) och [arbetstid per månad 2027](page:hours-2027).`,
  ],
  sections: [
    {
      h2: 'Så räknar vi',
      body: [
        `En arbetsdag är en vardag, måndag till fredag, som inte är en allmän helgdag. Vilka dagar som är helgdagar står i [lagen om allmänna helgdagar](${helgdagslagen}): nyårsdagen, trettondedag jul, långfredagen, påskdagen, annandag påsk, första maj, Kristi himmelsfärdsdag, pingstdagen, nationaldagen, midsommardagen, alla helgons dag, juldagen och annandag jul, och dessutom alla söndagar.`,
        'Midsommarafton, julafton och nyårsafton är inte helgdagar enligt lagen, men de flesta arbetsplatser har dem lediga. Därför visar tabellerna två siffror: arbetsdagar enligt lag, och arbetsdagar i praktiken när de tre aftnarna är lediga. Timmarna räknas på arbetsdagarna i praktiken.',
        'Datumen räknas fram, de skrivs inte in för hand. Påskdagen följer den gregorianska påskberäkningen, långfredagen är två dagar före och annandag påsk dagen efter, Kristi himmelsfärdsdag kommer 39 dagar efter påskdagen och pingstdagen 49 dagar efter. Midsommardagen är lördagen mellan 20 och 26 juni och alla helgons dag lördagen mellan 31 oktober och 6 november.',
      ],
    },
    {
      h2: 'Heltid och deltid',
      body: [
        'Enligt arbetstidslagen är den ordinarie arbetstiden högst 40 timmar i veckan (5 §). Fem dagar med 8 timmar blir 40 timmar, och det är vad tabellerna räknar med för heltid. Ett kollektivavtal kan ha en annan veckoarbetstid (3 §), så kolla ert avtal. Reglerna om övertid, rast och vila står i guiden om [arbetstidslagen](page:guide-working-hours-act).',
        'För deltid multiplicerar du heltidstimmarna med tjänstgöringsgraden. 75 procent är 6 timmar per arbetsdag och 50 procent är 4 timmar, och årstabellerna visar båda för varje månad. Arbetar någon 80 procent i en månad med 168 heltidstimmar blir det 134,4 timmar.',
      ],
    },
    {
      h2: 'Röda dagar och klämdagar',
      body: [
        'Antalet arbetsdagar skiljer sig mellan åren eftersom helgdagarna flyttar sig. Långfredagen, annandag påsk och Kristi himmelsfärdsdag följer påsken och kan hamna i mars, april, maj eller juni. De fasta helgdagarna, som första maj, nationaldagen och juldagen, ger bara en ledig vardag när de inte infaller på en lördag eller söndag.',
        `Därför har 2027 fler arbetsdagar än 2026. Första maj och juldagen infaller 2027 på en lördag, nationaldagen och annandag jul på en söndag, så 2027 har ${y27.publicOnWeekdays} röda dagar på vardagar mot ${y26.publicOnWeekdays} år 2026.`,
        'En klämdag är en vardag mellan en röd dag och helgen, till exempel fredagen efter Kristi himmelsfärdsdag. Den är ingen helgdag enligt lag, och om den är ledig avgörs av avtal eller arbetsgivaren. Tabellerna räknar den som en vanlig arbetsdag och listar den för sig.',
        'Vissa kollektivavtal förkortar också andra aftnar, som trettondagsafton, skärtorsdagen, valborgsmässoafton, dagen före Kristi himmelsfärdsdag och allhelgonaafton. De ingår inte i tabellerna; kolla ert avtal.',
      ],
    },
    {
      h2: 'Timmar per månad för timanställda',
      body: [
        'För [timanställda](page:hourly) finns ingen fast månadstid: timmarna följer de pass som faktiskt blev av. Tabellen är då ett tak att jämföra med, inte ett facit. Summera de verkliga passen med verktyget för att [räkna ut arbetstid](page:calculator), eller låt Klokka räkna ihop månaden.',
      ],
    },
    {
      h2: 'Från tabell till faktiska timmar',
      body: [
        'En tabell visar hur många timmar en månad kan ha. Hur många det faktiskt blev syns först när någon för in dem. I Klokka loggar arbetsgivaren timmarna per anställd och dag, och den anställda ser samma månad i mobilen, med summa, snitt per arbetsdag och jämförelse med förra månaden.',
      ],
    },
  ],
  faq: [
    {
      q: 'Hur många arbetstimmar är det i en månad?',
      a: `Vid heltid mellan ${y26.minHours} och ${y26.maxHours} timmar 2026, i snitt ${y26.avgHours} timmar per månad. 2027 ligger mellan ${y27.minHours} och ${y27.maxHours} timmar, i snitt ${y27.avgHours}. Det beror på hur många vardagar och röda dagar månaden har.`,
    },
    {
      q: 'Hur många arbetsdagar är det 2026?',
      a: `${num(y26.practiceDays, 'sv')} när midsommarafton, julafton och nyårsafton är lediga, och ${num(y26.legalDays, 'sv')} enligt lag. Vid heltid blir det ${num(y26.practiceHours, 'sv')} respektive ${num(y26.legalHours, 'sv')} timmar.`,
    },
    {
      q: 'Hur många arbetsdagar är det 2027?',
      a: `${num(y27.practiceDays, 'sv')} när midsommarafton, julafton och nyårsafton är lediga, och ${num(y27.legalDays, 'sv')} enligt lag. Vid heltid blir det ${num(y27.practiceHours, 'sv')} respektive ${num(y27.legalHours, 'sv')} timmar.`,
    },
    {
      q: 'Hur många timmar är heltid i Sverige?',
      a: 'Enligt arbetstidslagen är den ordinarie arbetstiden högst 40 timmar i veckan, och det är vad tabellerna räknar med. Ett kollektivavtal kan ha en annan veckoarbetstid.',
    },
    {
      q: 'Räknas julafton som arbetsdag?',
      a: 'Enligt lagen om allmänna helgdagar är julafton ingen helgdag, och detsamma gäller midsommarafton och nyårsafton. De flesta arbetsplatser har dem ändå lediga, så tabellerna räknar dem som lediga och visar arbetsdagarna enligt lag i en egen kolumn.',
    },
    {
      q: 'Vad är en klämdag?',
      a: 'En vardag mellan en röd dag och helgen, till exempel fredagen efter Kristi himmelsfärdsdag. Den är ingen helgdag enligt lag; om den är ledig avgörs av avtal eller arbetsgivaren.',
    },
  ],
  cta: {
    title: 'Logga de faktiska timmarna i Klokka.',
    body: 'Gratis att använda, inget kort behövs. Arbetsgivaren för in timmarna och de anställda ser samma månad.',
    button: 'Skapa ditt företag',
  },
  ...tableSv,
} as const satisfies TableCopy;

export const en: PageCopyOf<typeof sv> = {
  meta: {
    title: 'Working hours per month in Sweden, 2026 and 2027 | Klokka',
    description:
      'How many working hours and working days does each month have in Sweden in 2026 and 2027? Public holidays included, full time and part time.',
    ogAlt: 'Working hours per month in Sweden: a table of working days and hours from Klokka.',
  },
  card: { eyebrow: 'Table', title: 'Working hours per month in Sweden' },
  breadcrumb: 'Working hours per month',
  h1: 'Working hours per month in Sweden',
  lede: [
    "Each month in Sweden has a set number of working days: Monday to Friday minus public holidays, which at 8 hours a day gives the full-time hours below. The tables are computed from Sweden's Public Holidays Act, and come from Klokka, a free and open source (MIT) app for logging employee hours, on the web and in the Android app.",
    `In 2026 Sweden has ${num(y26.practiceDays, 'en')} working days and ${num(y26.practiceHours, 'en')} full-time hours; in 2027 it has ${num(y27.practiceDays, 'en')} working days and ${num(y27.practiceHours, 'en')} hours. Part time, holidays and bridge days for every month are in the tables for [working hours per month in Sweden 2026](page:hours-2026) and [working hours per month in Sweden 2027](page:hours-2027).`,
  ],
  sections: [
    {
      h2: 'How the tables are counted',
      body: [
        `A working day is a weekday, Monday to Friday, that is not a public holiday. The public holidays are set by [the Public Holidays Act (lagen om allmänna helgdagar)](${helgdagslagen}): New Year's Day, Epiphany, Good Friday, Easter Sunday, Easter Monday, 1 May, Ascension Day, Whit Sunday, the National Day on 6 June, Midsummer Day, All Saints' Day, Christmas Day and Boxing Day, plus every Sunday.`,
        "Midsummer Eve, Christmas Eve and New Year's Eve are not public holidays under the Act, but most workplaces take them off. So the tables show two figures: working days by law, and working days in practice with the three eves off. The hours are counted on the working days in practice.",
        "The dates are computed, never typed in. Easter Sunday follows the Gregorian Easter calculation, Good Friday is two days before and Easter Monday the day after, Ascension Day is 39 days after Easter Sunday and Whit Sunday 49 days after. Midsummer Day is the Saturday between 20 and 26 June and All Saints' Day the Saturday between 31 October and 6 November.",
      ],
    },
    {
      h2: 'Full time and part time',
      body: [
        'Under the Working Hours Act (arbetstidslagen), ordinary working time is at most 40 hours a week (section 5). Five days of 8 hours make 40 hours, which is what the tables count as full time. A collective agreement can set different weekly hours (section 3), so check yours. Overtime, breaks and rest are covered in the guide to [the Swedish Working Hours Act](page:guide-working-hours-act).',
        'For part time, multiply the full-time hours by the employment percentage. 75% is 6 hours per working day and 50% is 4 hours, and the yearly tables show both for every month. Someone on 80% in a month with 168 full-time hours works 134.4 hours.',
      ],
    },
    {
      h2: 'Public holidays and bridge days',
      body: [
        'The number of working days changes from year to year because the holidays move. Good Friday, Easter Monday and Ascension Day follow Easter and can land in March, April, May or June. The fixed holidays, such as 1 May, the National Day and Christmas Day, only give a weekday off when they do not fall on a Saturday or Sunday.',
        `That is why 2027 has more working days than 2026. In 2027, 1 May and Christmas Day fall on a Saturday and the National Day and Boxing Day on a Sunday, so 2027 has ${y27.publicOnWeekdays} public holidays on weekdays against ${y26.publicOnWeekdays} in 2026.`,
        'A bridge day (klämdag) is a weekday between a holiday and the weekend, such as the Friday after Ascension Day. It is not a holiday by law, and whether it is off depends on the agreement or the employer. The tables count it as a normal working day and list it separately.',
        "Some collective agreements also shorten other eves, such as the eve of Epiphany, Maundy Thursday, Walpurgis Night on 30 April, the day before Ascension Day and the eve of All Saints' Day. The tables leave them out; check your agreement.",
      ],
    },
    {
      h2: 'Hours per month for hourly staff',
      body: [
        'For [hourly employees](page:hourly) there is no fixed monthly time: the hours follow the shifts that actually happened. The table is then a ceiling to compare against, not the answer. Add up the real shifts with the [work hours calculator](page:calculator), or let Klokka add up the month.',
      ],
    },
    {
      h2: 'From a table to the real hours',
      body: [
        'A table shows how many hours a month can have. How many it actually had only shows once someone logs them. In Klokka the employer logs the hours per employee and day, and the employee sees the same month on their phone, with the total, the average per working day and a comparison with last month.',
      ],
    },
  ],
  faq: [
    {
      q: 'How many working hours are in a month in Sweden?',
      a: `At full time between ${y26.minHours} and ${y26.maxHours} hours in 2026, ${y26.avgHours} hours a month on average. In 2027 it is between ${y27.minHours} and ${y27.maxHours} hours, ${y27.avgHours} on average. It depends on how many weekdays and public holidays the month has.`,
    },
    {
      q: 'How many working days does Sweden have in 2026?',
      a: `${num(y26.practiceDays, 'en')} with Midsummer Eve, Christmas Eve and New Year's Eve off, and ${num(y26.legalDays, 'en')} by law. At full time that is ${num(y26.practiceHours, 'en')} and ${num(y26.legalHours, 'en')} hours.`,
    },
    {
      q: 'How many working days does Sweden have in 2027?',
      a: `${num(y27.practiceDays, 'en')} with Midsummer Eve, Christmas Eve and New Year's Eve off, and ${num(y27.legalDays, 'en')} by law. At full time that is ${num(y27.practiceHours, 'en')} and ${num(y27.legalHours, 'en')} hours.`,
    },
    {
      q: 'What counts as full time in Sweden?',
      a: 'Under the Working Hours Act, ordinary working time is at most 40 hours a week, and that is what the tables count as full time. A collective agreement can set different weekly hours.',
    },
    {
      q: 'Is Christmas Eve a working day in Sweden?',
      a: "Under the Public Holidays Act, Christmas Eve is not a public holiday, and neither are Midsummer Eve and New Year's Eve. Most workplaces take them off anyway, so the tables count them as days off and show the working days by law in a column of their own.",
    },
    {
      q: 'What is a bridge day (klämdag)?',
      a: 'A weekday between a public holiday and the weekend, such as the Friday after Ascension Day. It is not a holiday by law; whether it is off depends on the agreement or the employer.',
    },
  ],
  cta: {
    title: 'Log the actual hours in Klokka.',
    body: 'Free to use, no card needed. The employer logs the hours and the staff see the same month.',
    button: 'Create your business',
  },
  ...tableEn,
};
