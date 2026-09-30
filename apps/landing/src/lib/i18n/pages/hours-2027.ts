import { HOURS_PER_DAY } from '@/lib/workdays';
import { capitalized, monthList, num, tableEn, tableSv, yearFacts } from './hours';
import type { PageCopyOf, TableCopy } from './types';

// Every number below is computed from lib/workdays.ts (the table and this text cannot disagree); the calendar facts
// in words (which weekday a holiday falls on) are pinned by test/workdays.test.ts.

const f = yearFacts(2027);
const before = yearFacts(2026);
const jan = f.month(1);
const apr = f.month(4);
const dec = f.month(12);
const part80 = (apr.practiceDays * HOURS_PER_DAY * 8) / 10;

export const sv = {
  meta: {
    title: 'Arbetstid per månad 2027: timmar och arbetsdagar | Klokka',
    description:
      'Hur många arbetstimmar och arbetsdagar har varje månad 2027? Tabell med röda dagar inräknade, för heltid och deltid.',
    ogAlt: 'Arbetstid per månad 2027: arbetsdagar och arbetstimmar i en tabell från Klokka.',
  },
  card: { eyebrow: '2027', title: 'Arbetstimmar och arbetsdagar 2027' },
  breadcrumb: '2027',
  h1: 'Arbetstid per månad 2027',
  lede: [
    `2027 har ${num(f.practiceDays, 'sv')} arbetsdagar i Sverige, vilket blir ${num(f.practiceHours, 'sv')} timmar vid heltid på 40 timmar i veckan. Tabellen visar varje månad med röda dagar, deltid och klämdagar.`,
  ],
  sections: [
    {
      h2: 'Det här är speciellt med 2027',
      body: [
        `2027 har bara ${f.publicOnWeekdays} röda dagar på vardagar. Första maj och juldagen infaller på en lördag, nationaldagen och annandag jul på en söndag, så ingen av dem ger en ledig vardag. Därför har 2027 ${num(f.legalDays, 'sv')} arbetsdagar enligt lag, ${f.legalDays - before.legalDays} fler än 2026.`,
        `Påsken är tidig: påskdagen är 28 mars, så långfredagen och annandag påsk hamnar båda i mars, och april får ${apr.practiceDays} arbetsdagar utan en enda röd dag. Nyårsdagen är en fredag och trettondedag jul en onsdag, så januari blir årets kortaste månad med ${jan.practiceDays} arbetsdagar och ${jan.practiceDays * HOURS_PER_DAY} timmar.`,
        `Julafton och nyårsafton är fredagar. December har ${dec.legalDays} arbetsdagar enligt lag, fler än någon annan månad, men ${dec.practiceDays} i praktiken när de två aftnarna är lediga. Årets enda klämdag är fredag 7 maj, dagen efter Kristi himmelsfärdsdag.`,
      ],
    },
    {
      h2: 'Deltid 2027',
      body: [
        `Vid 75 procent blir hela året ${num(f.practiceDays * 6, 'sv')} timmar och vid 50 procent ${num(f.practiceDays * 4, 'sv')} timmar. För en annan tjänstgöringsgrad multiplicerar du heltidstimmarna med procentsatsen: 80 procent av aprils ${apr.practiceDays * HOURS_PER_DAY} timmar är ${num(part80, 'sv')} timmar.`,
      ],
    },
    {
      h2: 'Så räknar vi',
      body: [
        'Tabellen räknar måndag till fredag minus de allmänna helgdagarna enligt lag, och i praktiken också minus midsommarafton, julafton och nyårsafton, med 8 timmar per arbetsdag vid heltid. Förklaringen och båda åren sida vid sida finns under [arbetstid per månad](page:hours), och året innan under [arbetstid per månad 2026](page:hours-2026).',
        'Planerar du 2027 redan nu? Tabellen visar hur många timmar varje månad har vid heltid; de faktiska timmarna syns först när någon för in dem. I Klokka loggar arbetsgivaren timmarna per dag och de anställda ser samma månad. För ett enstaka pass finns verktyget för att [räkna ut arbetstid](page:calculator).',
      ],
    },
  ],
  faq: [
    {
      q: 'Hur många arbetsdagar är det 2027?',
      a: `${num(f.practiceDays, 'sv')} när midsommarafton, julafton och nyårsafton är lediga, och ${num(f.legalDays, 'sv')} enligt lag. Vid heltid blir det ${num(f.practiceHours, 'sv')} respektive ${num(f.legalHours, 'sv')} timmar.`,
    },
    {
      q: 'Vilken månad har flest arbetstimmar 2027?',
      a: `${capitalized(monthList(f.longestMonths, 'sv'))}, med ${f.mostDays} arbetsdagar och ${f.maxHours} timmar vid heltid. ${capitalized(monthList(f.shortestMonths, 'sv'))} har minst: ${f.fewestDays} arbetsdagar och ${f.minHours} timmar.`,
    },
    {
      q: 'Är julafton 2027 en arbetsdag?',
      a: 'Julafton 2027 är en fredag. Den är ingen helgdag enligt lag, men de flesta har den ledig, och tabellen räknar den som ledig. Juldagen och annandag jul infaller på lördag och söndag, så de ger ingen extra ledig vardag.',
    },
    {
      q: 'Hur många timmar är deltid 75 procent 2027?',
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
    title: 'Working hours per month in Sweden 2027 | Klokka',
    description:
      'How many working hours and working days does each month have in Sweden in 2027? Public holidays included, full time and part time.',
    ogAlt: 'Working hours per month in Sweden 2027: working days and hours in a table from Klokka.',
  },
  card: { eyebrow: '2027', title: 'Working hours per month in Sweden 2027' },
  breadcrumb: '2027',
  h1: 'Working hours per month in Sweden, 2027',
  lede: [
    `Sweden has ${num(f.practiceDays, 'en')} working days in 2027, which is ${num(f.practiceHours, 'en')} hours at full time on a 40-hour week. The table shows every month with its public holidays, part time and bridge days.`,
  ],
  sections: [
    {
      h2: 'What is special about 2027',
      body: [
        `2027 has only ${f.publicOnWeekdays} public holidays on weekdays. 1 May and Christmas Day fall on a Saturday, the National Day and Boxing Day on a Sunday, so none of them gives a weekday off. That is why 2027 has ${num(f.legalDays, 'en')} working days by law, ${f.legalDays - before.legalDays} more than 2026.`,
        `Easter is early: Easter Sunday is 28 March, so Good Friday and Easter Monday both land in March, and April gets ${apr.practiceDays} working days without a single public holiday. New Year's Day is a Friday and Epiphany a Wednesday, so January is the shortest month, with ${jan.practiceDays} working days and ${jan.practiceDays * HOURS_PER_DAY} hours.`,
        `Christmas Eve and New Year's Eve are Fridays. December has ${dec.legalDays} working days by law, more than any other month, but ${dec.practiceDays} in practice with the two eves off. The year's only bridge day is Friday 7 May, the day after Ascension Day.`,
      ],
    },
    {
      h2: 'Part time in 2027',
      body: [
        `At 75% the whole year is ${num(f.practiceDays * 6, 'en')} hours, and at 50% it is ${num(f.practiceDays * 4, 'en')} hours. For any other percentage, multiply the full-time hours by it: 80% of April's ${apr.practiceDays * HOURS_PER_DAY} hours is ${num(part80, 'en')} hours.`,
      ],
    },
    {
      h2: 'How the table is counted',
      body: [
        "The table counts Monday to Friday minus the public holidays by law, and in practice also minus Midsummer Eve, Christmas Eve and New Year's Eve, at 8 hours per working day for full time. The explanation, with both years side by side, is under [working hours per month in Sweden](page:hours), and the year before under [working hours per month in Sweden 2026](page:hours-2026).",
        'Planning 2027 already? The table shows how many hours each month has at full time; the actual hours only show once someone logs them. In Klokka the employer logs the hours per day and the staff see the same month. For a single shift there is the [work hours calculator](page:calculator).',
      ],
    },
  ],
  faq: [
    {
      q: 'How many working days does Sweden have in 2027?',
      a: `${num(f.practiceDays, 'en')} with Midsummer Eve, Christmas Eve and New Year's Eve off, and ${num(f.legalDays, 'en')} by law. At full time that is ${num(f.practiceHours, 'en')} and ${num(f.legalHours, 'en')} hours.`,
    },
    {
      q: 'Which month has the most working hours in 2027?',
      a: `${monthList(f.longestMonths, 'en')}, with ${f.mostDays} working days and ${f.maxHours} hours at full time. ${monthList(f.shortestMonths, 'en')} has the fewest: ${f.fewestDays} working days and ${f.minHours} hours.`,
    },
    {
      q: 'Is Christmas Eve 2027 a working day in Sweden?',
      a: 'Christmas Eve 2027 is a Friday. It is not a public holiday by law, but most people have it off, and the table counts it as a day off. Christmas Day and Boxing Day fall on Saturday and Sunday, so they give no extra weekday off.',
    },
    {
      q: 'How many hours is 75% part time in 2027?',
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
