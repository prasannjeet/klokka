import { HOURS_PER_DAY } from '@/lib/workdays';
import { capitalized, monthList, num, tableEn, tableSv, yearFacts } from './hours';
import type { PageCopyOf, TableCopy } from './types';

// Every number below is computed from lib/workdays.ts (the table and this text cannot disagree); the calendar facts
// in words (which weekday a holiday falls on) are pinned by test/workdays.test.ts.

const f = yearFacts(2026);
const may = f.month(5);
const jul = f.month(7);
const oct = f.month(10);
const dec = f.month(12);
const part80 = (oct.practiceDays * HOURS_PER_DAY * 8) / 10;

export const sv = {
  meta: {
    title: 'Arbetstid per månad 2026: timmar och arbetsdagar | Klokka',
    description:
      'Hur många arbetstimmar och arbetsdagar har varje månad 2026? Tabell med röda dagar inräknade, för heltid och deltid.',
    ogAlt: 'Arbetstid per månad 2026: arbetsdagar och arbetstimmar i en tabell från Klokka.',
  },
  card: { eyebrow: '2026', title: 'Arbetstimmar och arbetsdagar 2026' },
  breadcrumb: '2026',
  h1: 'Arbetstid per månad 2026',
  lede: [
    `2026 har ${num(f.practiceDays, 'sv')} arbetsdagar i Sverige, vilket blir ${num(f.practiceHours, 'sv')} timmar vid heltid på 40 timmar i veckan. Tabellen visar varje månad med röda dagar, deltid och klämdagar.`,
  ],
  sections: [
    {
      h2: 'Det här är speciellt med 2026',
      body: [
        `2026 har ${f.publicOnWeekdays} röda dagar på vardagar. Nyårsdagen är en torsdag och trettondedag jul en tisdag, så januari får två klämdagar. Påskdagen är 5 april, så långfredagen och annandag påsk hamnar i april, och första maj är en fredag som ger en lång helg.`,
        `Kristi himmelsfärdsdag är torsdag 14 maj, och fredagen efter blir årets tredje klämdag. Med första maj och Kristi himmelsfärdsdag på vardagar blir maj årets kortaste månad: ${may.practiceDays} arbetsdagar och ${may.practiceDays * HOURS_PER_DAY} timmar vid heltid. Juli är längst, med ${jul.practiceDays} arbetsdagar och ${jul.practiceDays * HOURS_PER_DAY} timmar.`,
        `Nationaldagen och annandag jul infaller på en lördag och ger därför ingen ledig vardag. Julafton och nyårsafton är torsdagar och juldagen en fredag, så december har ${dec.legalDays} arbetsdagar enligt lag men ${dec.practiceDays} i praktiken.`,
      ],
    },
    {
      h2: 'Deltid 2026',
      body: [
        `Vid 75 procent blir hela året ${num(f.practiceDays * 6, 'sv')} timmar och vid 50 procent ${num(f.practiceDays * 4, 'sv')} timmar. För en annan tjänstgöringsgrad multiplicerar du heltidstimmarna med procentsatsen: 80 procent av oktobers ${oct.practiceDays * HOURS_PER_DAY} timmar är ${num(part80, 'sv')} timmar.`,
      ],
    },
    {
      h2: 'Så räknar vi',
      body: [
        'Arbetsdagar är måndag till fredag minus de allmänna helgdagarna, och i praktiken också minus midsommarafton, julafton och nyårsafton. Heltid är 8 timmar per arbetsdag, alltså 40 timmar i veckan enligt arbetstidslagen. Hela förklaringen och båda åren sida vid sida finns under [arbetstid per månad](page:hours), och nästa år under [arbetstid per månad 2027](page:hours-2027).',
        'Tabellen säger hur många timmar en månad har vid heltid, inte hur många någon faktiskt jobbade. Det vet bara den som för in timmarna, och det är vad Klokka är till för: arbetsgivaren loggar timmarna per dag och de anställda ser samma månad. För ett enstaka pass finns verktyget för att [räkna ut arbetstid](page:calculator).',
      ],
    },
  ],
  faq: [
    {
      q: 'Hur många arbetsdagar är det 2026?',
      a: `${num(f.practiceDays, 'sv')} när midsommarafton, julafton och nyårsafton är lediga, och ${num(f.legalDays, 'sv')} enligt lag. Vid heltid blir det ${num(f.practiceHours, 'sv')} respektive ${num(f.legalHours, 'sv')} timmar.`,
    },
    {
      q: 'Vilken månad har flest arbetstimmar 2026?',
      a: `${capitalized(monthList(f.longestMonths, 'sv'))}, med ${f.mostDays} arbetsdagar och ${f.maxHours} timmar vid heltid. ${capitalized(monthList(f.shortestMonths, 'sv'))} har minst: ${f.fewestDays} arbetsdagar och ${f.minHours} timmar.`,
    },
    {
      q: 'Är julafton 2026 en arbetsdag?',
      a: 'Julafton 2026 är en torsdag. Den är ingen helgdag enligt lag, men de flesta har den ledig, och tabellen räknar den som ledig. Juldagen är en fredag, så många får fyra lediga dagar i rad.',
    },
    {
      q: 'Hur många timmar är deltid 75 procent 2026?',
      a: `${num(f.practiceDays * 6, 'sv')} timmar för hela året, 6 timmar per arbetsdag. Deltid 50 procent är ${num(f.practiceDays * 4, 'sv')} timmar.`,
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
    title: 'Working hours per month in Sweden 2026 | Klokka',
    description:
      'How many working hours and working days does each month have in Sweden in 2026? Public holidays included, full time and part time.',
    ogAlt: 'Working hours per month in Sweden 2026: working days and hours in a table from Klokka.',
  },
  card: { eyebrow: '2026', title: 'Working hours per month in Sweden 2026' },
  breadcrumb: '2026',
  h1: 'Working hours per month in Sweden, 2026',
  lede: [
    `Sweden has ${num(f.practiceDays, 'en')} working days in 2026, which is ${num(f.practiceHours, 'en')} hours at full time on a 40-hour week. The table shows every month with its public holidays, part time and bridge days.`,
  ],
  sections: [
    {
      h2: 'What is special about 2026',
      body: [
        `2026 has ${f.publicOnWeekdays} public holidays on weekdays. New Year's Day is a Thursday and Epiphany a Tuesday, so January gets two bridge days. Easter Sunday is 5 April, so Good Friday and Easter Monday land in April, and 1 May is a Friday, which makes a long weekend.`,
        `Ascension Day is Thursday 14 May, and the Friday after is the year's third bridge day. With 1 May and Ascension Day on weekdays, May is the shortest month: ${may.practiceDays} working days and ${may.practiceDays * HOURS_PER_DAY} hours at full time. July is the longest, with ${jul.practiceDays} working days and ${jul.practiceDays * HOURS_PER_DAY} hours.`,
        `The National Day and Boxing Day fall on a Saturday, so they give no weekday off. Christmas Eve and New Year's Eve are Thursdays and Christmas Day a Friday, so December has ${dec.legalDays} working days by law but ${dec.practiceDays} in practice.`,
      ],
    },
    {
      h2: 'Part time in 2026',
      body: [
        `At 75% the whole year is ${num(f.practiceDays * 6, 'en')} hours, and at 50% it is ${num(f.practiceDays * 4, 'en')} hours. For any other percentage, multiply the full-time hours by it: 80% of October's ${oct.practiceDays * HOURS_PER_DAY} hours is ${num(part80, 'en')} hours.`,
      ],
    },
    {
      h2: 'How the table is counted',
      body: [
        "Working days are Monday to Friday minus the public holidays, and in practice also minus Midsummer Eve, Christmas Eve and New Year's Eve. Full time is 8 hours per working day, which is 40 hours a week under the Working Hours Act. The full explanation, with both years side by side, is under [working hours per month in Sweden](page:hours), and next year under [working hours per month in Sweden 2027](page:hours-2027).",
        'The table says how many hours a month has at full time, not how many anyone actually worked. Only whoever logs the hours knows that, and that is what Klokka is for: the employer logs the hours per day and the staff see the same month. For a single shift there is the [work hours calculator](page:calculator).',
      ],
    },
  ],
  faq: [
    {
      q: 'How many working days does Sweden have in 2026?',
      a: `${num(f.practiceDays, 'en')} with Midsummer Eve, Christmas Eve and New Year's Eve off, and ${num(f.legalDays, 'en')} by law. At full time that is ${num(f.practiceHours, 'en')} and ${num(f.legalHours, 'en')} hours.`,
    },
    {
      q: 'Which month has the most working hours in 2026?',
      a: `${monthList(f.longestMonths, 'en')}, with ${f.mostDays} working days and ${f.maxHours} hours at full time. ${monthList(f.shortestMonths, 'en')} has the fewest: ${f.fewestDays} working days and ${f.minHours} hours.`,
    },
    {
      q: 'Is Christmas Eve 2026 a working day in Sweden?',
      a: 'Christmas Eve 2026 is a Thursday. It is not a public holiday by law, but most people have it off, and the table counts it as a day off. Christmas Day is a Friday, so many get four days off in a row.',
    },
    {
      q: 'How many hours is 75% part time in 2026?',
      a: `${num(f.practiceDays * 6, 'en')} hours for the whole year, 6 hours per working day. 50% part time is ${num(f.practiceDays * 4, 'en')} hours.`,
    },
  ],
  cta: {
    title: 'Log the actual hours in Klokka.',
    body: 'Free to use, no card needed. The employer logs the hours and the staff see the same month.',
    button: 'Create your business',
  },
  ...tableEn,
};
