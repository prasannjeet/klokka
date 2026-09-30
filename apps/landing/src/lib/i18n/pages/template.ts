// Also read by scripts/templates.ts (Node type stripping) for the labels inside the xlsx and PDF files, so this
// file may only have type imports.
import type { PageCopyOf, ToolCopy } from './types';

const afs =
  'https://www.av.se/arbetsmiljoarbete-och-inspektioner/arbetsgivarens-ansvar-for-arbetsmiljon/anteckna-uppgifter-om-jourtid-overtid-och-mertid/';
const bfl =
  'https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/bokforingslag-19991078_sfs-1999-1078/';

export const sv = {
  meta: {
    title: 'Tidrapport mall: gratis i Excel och PDF | Klokka',
    description:
      'Ladda ner en gratis tidrapport mall för månaden i Excel eller PDF. Fyll i timmar per dag och få summan direkt. Ingen registrering.',
    ogAlt: 'Tidrapport mall för en månad i Excel och PDF, gratis från Klokka.',
  },
  card: { eyebrow: 'Gratis mall', title: 'Tidrapport mall i Excel och PDF' },
  breadcrumb: 'Tidrapport mall',
  h1: 'Tidrapport mall för en månad, gratis i Excel och PDF',
  lede: [
    'Ladda ner en gratis tidrapport mall för en hel månad, i Excel eller som PDF att skriva ut, utan registrering. Mallen kommer från Klokka, en gratis app med öppen källkod (MIT) där arbetsgivaren för in timmarna och de anställda ser samma månad, utan gräns för antalet anställda, på webben och i Android-appen, på svenska och engelska.',
  ],
  sections: [
    {
      h2: 'Vad mallen innehåller',
      body: [
        'En sida per anställd och månad. Överst står företaget, den anställda och månaden, så att ingen behöver gissa vems timmar det är. Sedan kommer en rad för varje dag i månaden, 1 till 31, och längst ner summan och plats för två underskrifter.',
      ],
      list: [
        'Datum och veckodag: vilken dag raden gäller.',
        'Start och slut: när passet började och slutade.',
        'Rast i minuter: dras av från passet.',
        'Timmar: räknas ut av Excel-filen, eller för hand på papperet.',
        'Anteckning: till exempel sjuk, semester eller ett byte av pass.',
      ],
    },
    {
      h2: 'Så fyller du i tidrapporten',
      body: [
        'Excel-filen räknar timmarna och summan själv. På PDF-versionen räknar du för hand: slut minus start minus rast.',
      ],
      list: [
        'Skriv företagets namn, den anställdas namn och månaden överst.',
        'Fyll i en rad för varje dag med arbete: start, slut och rast i minuter. Skriv tider som 08:00.',
        'Lämna dagar utan arbete tomma, eller skriv en anteckning som ledig eller sjuk.',
        'Kontrollera summan längst ner när månaden är slut.',
        'Skriv under båda två, så är ni överens om månaden, och spara ett exemplar var.',
      ],
    },
    {
      h2: 'En mall för flera anställda',
      body: [
        'Gör en kopia per anställd och månad. I Excel eller Google Kalkylark duplicerar du fliken och döper den efter den anställda, så har du hela personalen i en fil. På papper skriver du ut en sida per person.',
      ],
    },
    {
      h2: 'Räkna timmar med rast',
      body: [
        'Ett pass från 08:00 till 16:30 med 30 minuters rast är 8 timmar. Slutar passet efter midnatt räknas det till nästa dag, både i Excel-filen och i vår [räknare för arbetstid](page:calculator), som också visar timmarna som decimaltal.',
      ],
    },
    {
      h2: 'Hur länge ska tidrapporten sparas?',
      body: [
        `Anteckningar om övertid och mertid ska finnas kvar det kalenderår de gäller och två kalenderår till ([Arbetsmiljöverket, AFS 2023:2 kapitel 9](${afs})). Används tidrapporten som underlag för lönen är den en del av bokföringen, som sparas till och med det sjunde året efter räkenskapsårets slut ([bokföringslagen 7 kap. 2 §](${bfl})). Mer om vad som gäller i [guiden om tidrapporter](page:guide-timesheet).`,
      ],
    },
    {
      h2: 'När mallen inte räcker',
      body: [
        'Ett papper eller en Excel-fil är bara så aktuell som senast någon öppnade den. Den anställda ser inte timmarna förrän i slutet av månaden, och ingen ser vem som ändrade vad.',
        'I Klokka för arbetsgivaren in timmarna per dag och den anställda ser dem direkt i mobilen, får en notis när något ändras och kan flagga en rad som ser fel ut. Varje ändring sparas, och månaden kan låsas och exporteras som CSV. Läs mer om [tidrapportering för småföretag](page:small-business).',
      ],
    },
  ],
  faq: [
    {
      q: 'Finns det en gratis tidrapport mall i Excel?',
      a: 'Ja, den här. Excel-filen är gratis, kräver ingen registrering och räknar timmarna per dag och summan för månaden med formler.',
    },
    {
      q: 'Fungerar mallen i Google Kalkylark?',
      a: 'Ja. Ladda upp xlsx-filen till Google Drive och öppna den i Google Kalkylark. Formlerna använder bara vanliga funktioner som finns i både Excel och Google Kalkylark.',
    },
    {
      q: 'Vad ska en tidrapport innehålla?',
      a: 'Vem den gäller, vilken period och per dag start, slut, rast och timmar. För övertid och mertid kräver Arbetsmiljöverket också arbetsgivarens namn, arbetsplatsen och den anställdas personnummer eller anställningsnummer. Mer i [guiden om tidrapporter](page:guide-timesheet).',
    },
    {
      q: 'Kan jag använda mallen för flera anställda?',
      a: 'Ja, med en kopia per anställd och månad: duplicera fliken i Excel eller skriv ut en PDF per person. Med många anställda är det enklare i [Klokka](page:home), där alla syns i samma veckovy.',
    },
  ],
  cta: {
    title: 'Slipp mallen: skapa ditt företag i Klokka.',
    body: 'Gratis att använda, inget kort behövs. Arbetsgivaren för in timmarna och de anställda ser samma månad.',
    button: 'Skapa ditt företag',
  },
  tool: {
    downloadTitle: 'Ladda ner mallen',
    xlsxLabel: 'Ladda ner Excel (xlsx, {size})',
    pdfLabel: 'Ladda ner PDF (A4, {size})',
    formats:
      'Excel-filen öppnas i Excel, Google Kalkylark och LibreOffice och räknar timmarna med formler. PDF-filen är gjord för att skrivas ut och fyllas i för hand.',
    previewAlt:
      'Förhandsvisning av tidrapport mallen: en A4-sida med fälten Företag, Anställd och Månad, en rad per dag från 1 till 31 med start, slut, rast, timmar och anteckning, en summarad och underskrifter för anställd och arbetsgivare.',
    live: 'Eller låt båda se timmarna direkt i [Klokka](page:home): arbetsgivaren för in dem och den anställda ser samma månad i mobilen.',
    sheetName: 'Tidrapport',
    sheetTitle: 'Tidrapport',
    business: 'Företag',
    employee: 'Anställd',
    month: 'Månad',
    date: 'Datum',
    weekday: 'Veckodag',
    start: 'Start',
    end: 'Slut',
    break: 'Rast (min)',
    hours: 'Timmar',
    note: 'Anteckning',
    total: 'Summa timmar',
    signEmployee: 'Anställd, underskrift',
    signEmployer: 'Arbetsgivare, underskrift',
    signDate: 'Datum',
    xlsxHint:
      'Skriv tider som 08:00. Timmar = slut minus start minus rast. Ett pass som slutar efter midnatt räknas till nästa dag.',
    pdfHint: 'Timmar = slut minus start minus rast. Ett pass som slutar efter midnatt räknas till nästa dag.',
    source: 'Gratis mall från klokka.se',
  },
} as const satisfies ToolCopy;

export const en: PageCopyOf<typeof sv> = {
  meta: {
    title: 'Free monthly timesheet template, Excel and PDF | Klokka',
    description:
      'Download a free monthly timesheet template in Excel or PDF. Fill in hours per day and get the total automatically. No sign-up.',
    ogAlt: 'A free monthly timesheet template in Excel and PDF from Klokka.',
  },
  card: { eyebrow: 'Free template', title: 'Monthly timesheet template' },
  breadcrumb: 'Timesheet template',
  h1: 'Free monthly timesheet template in Excel and PDF',
  lede: [
    'Download a free timesheet template for a whole month, in Excel or as a printable PDF, with no sign-up. It comes from Klokka, a free and open source (MIT) app where the employer logs the hours and each employee sees the same month, with no limit on employees, on the web and in the Android app, in English and Swedish.',
  ],
  sections: [
    {
      h2: 'What the template contains',
      body: [
        'One page per employee and month. At the top go the business, the employee and the month, so nobody has to guess whose hours these are. Then comes a row for every day of the month, 1 to 31, and at the bottom the total and room for two signatures.',
      ],
      list: [
        'Date and weekday: which day the row is for.',
        'Start and end: when the shift began and ended.',
        'Break in minutes: taken off the shift.',
        'Hours: worked out by the Excel file, or by hand on paper.',
        'Note: for example sick, holiday or a swapped shift.',
      ],
    },
    {
      h2: 'How to fill in the timesheet',
      body: [
        'The Excel file works out the hours and the total by itself. On the PDF you do it by hand: end minus start minus the break.',
      ],
      list: [
        'Write the business name, the employee name and the month at the top.',
        'Fill in a row for every day worked: start, end and the break in minutes. Type times as 08:00.',
        'Leave days off empty, or add a note such as off or sick.',
        'Check the total at the bottom when the month is over.',
        'Both of you sign, so you agree on the month, and each keeps a copy.',
      ],
    },
    {
      h2: 'A timesheet template for multiple employees',
      body: [
        'Make one copy per employee and month. In Excel or Google Sheets, duplicate the tab and name it after the employee, and the whole staff is in one file. On paper, print one page per person.',
      ],
    },
    {
      h2: 'Hours with a break',
      body: [
        'A shift from 08:00 to 16:30 with a 30 minute break is 8 hours. A shift that ends after midnight counts into the next day, both in the Excel file and in our [work hours calculator](page:calculator), which also shows the hours as a decimal.',
      ],
    },
    {
      h2: 'How long should timesheets be kept in Sweden?',
      body: [
        `Records of overtime and additional hours are kept for the calendar year they cover and two more calendar years ([Swedish Work Environment Authority, AFS 2023:2 chapter 9](${afs}), in Swedish). If the timesheet is the basis for pay it is part of the accounting records, which are kept until the end of the seventh year after the financial year ([Bokföringslagen, chapter 7 section 2](${bfl}), in Swedish). More in the guide on [how to track employee hours](page:guide-timesheet).`,
      ],
    },
    {
      h2: 'When a template is not enough',
      body: [
        'A paper sheet or an Excel file is only as current as the last time someone opened it. The employee does not see the hours until the end of the month, and nobody can see who changed what.',
        'In Klokka the employer logs the hours per day and the employee sees them straight away on their phone, is notified when something changes and can flag a row that looks wrong. Every change is kept, and the month can be locked and exported as CSV. Read more about [time tracking for small businesses](page:small-business).',
      ],
    },
  ],
  faq: [
    {
      q: 'Is there a free timesheet template for Excel?',
      a: 'Yes, this one. The Excel file is free, needs no sign-up and works out the hours per day and the month total with formulas.',
    },
    {
      q: 'Does it work in Google Sheets?',
      a: 'Yes. Upload the xlsx file to Google Drive and open it in Google Sheets. The formulas only use common functions that work in both Excel and Google Sheets.',
    },
    {
      q: 'What should a timesheet include?',
      a: "Who it is for, the period, and for each day the start, end, break and hours. For overtime, Swedish rules also ask for the employer name, the workplace and the employee's personal identity or employee number. More in the guide on [how to track employee hours](page:guide-timesheet).",
    },
    {
      q: 'Can I use it for multiple employees?',
      a: 'Yes, with one copy per employee and month: duplicate the tab in Excel or print one PDF per person. With many employees it is simpler in [Klokka](page:home), where everyone is in the same week view.',
    },
  ],
  cta: {
    title: 'Skip the sheet: create your business in Klokka.',
    body: 'Free to use, no card needed. The employer logs the hours and each employee sees the same month.',
    button: 'Create your business',
  },
  tool: {
    downloadTitle: 'Download the template',
    xlsxLabel: 'Download Excel (xlsx, {size})',
    pdfLabel: 'Download PDF (A4, {size})',
    formats:
      'The Excel file opens in Excel, Google Sheets and LibreOffice and works out the hours with formulas. The PDF is made to be printed and filled in by hand.',
    previewAlt:
      'Preview of the timesheet template: an A4 page with Business, Employee and Month fields, a row per day from 1 to 31 with start, end, break, hours and note, a total row and signatures for employee and employer.',
    live: 'Or let both sides see the hours live in [Klokka](page:home): the employer logs them and the employee sees the same month on their phone.',
    sheetName: 'Timesheet',
    sheetTitle: 'Timesheet',
    business: 'Business',
    employee: 'Employee',
    month: 'Month',
    date: 'Date',
    weekday: 'Weekday',
    start: 'Start',
    end: 'End',
    break: 'Break (min)',
    hours: 'Hours',
    note: 'Note',
    total: 'Total hours',
    signEmployee: 'Employee signature',
    signEmployer: 'Employer signature',
    signDate: 'Date',
    xlsxHint:
      'Type times as 08:00. Hours = end minus start minus break. A shift that ends after midnight counts into the next day.',
    pdfHint:
      'Hours = end minus start minus break. A shift that ends after midnight counts into the next day.',
    source: 'Free template from klokka.se',
  },
};
