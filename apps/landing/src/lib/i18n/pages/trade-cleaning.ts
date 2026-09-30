import type { IndustryCopy, PageCopyOf } from './types';

// Personalliggare, fact check 2026-09-30 (CHQ-149): cleaning is not among Skatteverket's six industries, but
// Skatteverket's FAQ says cleaning textile carpets is tvätteriverksamhet (ledger required unless it is about 25 percent
// of turnover or less). Prop. 2025/26:282 proposes no new industries. The old "ask the client what applies on site"
// pointer had no Skatteverket support and now links Skatteverket's FAQ. No collective agreement is named.
const skvList =
  'https://www.skatteverket.se/foretag/arbetsgivare/personalliggare.4.4f3d00a710cc9ae1c9c80007271.html';
const skvFaq =
  'https://www.skatteverket.se/foretag/etjansterochblanketter/svarpavanligafragor/personalliggare.4.3dfca4f410f4fc63c8680005658.html';
const prop = 'https://www.regeringen.se/rattsliga-dokument/proposition/2026/06/prop.-202526282';

export const sv = {
  meta: {
    title: 'Tidrapportering för städfirma med timanställda | Klokka',
    description:
      'Håll koll på städpersonalens timmar dag för dag, lås månaden och exportera till CSV inför lönen. Gratis att använda, öppen källkod.',
    ogAlt: 'Tidrapportering för städfirma: städpersonalens timmar, dag för dag.',
  },
  card: { eyebrow: 'Städfirma', title: 'Städpersonalens timmar, dag för dag' },
  breadcrumb: 'Städfirma',
  h1: 'Tidrapportering för städfirma',
  lede: [
    'Klokka är tidrapportering för städfirmor: du loggar varje städares timmar per dag, och personalen ser samma månad i mobilen, oavsett hur många kunder de har besökt. Klokka är gratis att använda, har öppen källkod (MIT), ingen gräns för antalet anställda och fungerar på webben och i Android-appen, på svenska och engelska.',
  ],
  notice: `Städfirmor omfattas i regel inte av kravet på personalliggare: städ finns inte bland de branscher som ska föra personalliggare enligt [Skatteverket](${skvList}). Rengör firman textilmattor räknas den delen dock som tvätteri. Läs mer i [personalliggare eller tidrapport](page:guide-personalliggare).`,
  week: {
    title: 'Blanka Städ',
    subtitle: 'Vecka 39, 21–27 september',
    label: 'Exempel: veckan på Blanka Städ, fyra anställda',
    caption:
      'Påhittad städfirma, påhittade siffror. Kontor på morgonen, trapphus på kvällen, en summa per dag.',
  },
  sections: [
    {
      h2: 'Så ser en vecka ut på en städfirma',
      body: [
        'Blanka Städ har fyra anställda. Fatima städar kontor tidigt på morgonen och trapphus på kvällen, och får en summa för dagen. Dragan har fasta morgonpass på samma två kontor. Sara tar tre kvällar i veckan hos en och samma kund. Ahmed kör de större jobben och tog en lördag när en flyttstädning inte kunde vänta.',
        'I Klokka förs en post in per person och dag. Delar sig dagen på två eller tre kunder skriver du timmarna som en summa och kundernas namn i anteckningen, så att det går att se vart tiden tog vägen.',
      ],
    },
    {
      h2: 'Timmar per person, inte per kund',
      body: [
        'Klokka räknar timmar per anställd och dag, inte per kund eller objekt. Det finns ingen rapport per kund och ingen fakturering. Anteckningen bär kundens namn, och den följer med i CSV-exporten, men själva faktureringen görs någon annanstans.',
        'Det är ett medvetet val: Klokka ska göra en sak, att du och personalen är överens om timmarna som lönen bygger på.',
      ],
    },
    {
      h2: 'Deltid, tidiga morgnar och en andra arbetsgivare',
      body: [
        'Många som städar jobbar deltid, börjar innan kontoren öppnar och har ett jobb till. Använder den andra arbetsgivaren också Klokka ser den anställda båda företagen med samma inloggning, var för sig, och ingen av er ser den andras timmar. Läs mer om [tidrapport för timanställda](page:hourly).',
      ],
    },
    {
      h2: 'Personalen ser samma siffror',
      body: [
        'Varje städare ser sina dagar, veckor och månad i mobilen och får en notis när timmar läggs till, ändras eller tas bort. Ser Sara att onsdagskvällen saknas flaggar hon dagen från mobilen, och du lägger till timmarna. Historiken sparar vem som ändrade vad och när.',
      ],
    },
    {
      h2: 'Lön på eller av',
      body: [
        'Med lön påslaget får varje anställd en timlön och ser beloppet bredvid timmarna. Klokka räknar inte ut OB för tidiga morgnar och kvällar, ersättning för restid eller övertid. Det görs i lönesystemet, utifrån ert kollektivavtal.',
      ],
    },
    {
      h2: 'Städfirmor och personalliggare',
      body: [
        `Kravet på personalliggare gäller i dag sex branscher: bygg, fordonsservice, kropps- och skönhetsvård, livsmedels- och tobaksgrossister, restaurang och tvätteri. Städ finns inte med, och regeringens proposition från juni 2026 ([prop. 2025/26:282](${prop})) föreslår inga nya branscher.`,
        `Rengör firman textilmattor räknas det enligt Skatteverket som tvätteriverksamhet, och då ska personalliggare föras om den delen är mer än ungefär 25 procent av omsättningen. Vad som gäller i andra fall står i [Skatteverkets frågor och svar om personalliggare](${skvFaq}). Klokka är ingen personalliggare, och skillnaden mellan liggare och tidrapport förklaras i [personalliggare eller tidrapport](page:guide-personalliggare).`,
      ],
    },
    {
      h2: 'Månadsslut',
      body: [
        'När månaden stämmer låser du den och exporterar en CSV-fil till lönebyrån, för en person eller hela firman. Behöver du räkna ihop två pass med ett uppehåll mellan finns en [kalkylator för arbetstid](page:calculator), och en [tidrapport mall](page:template) för den som hellre skriver på papper.',
      ],
    },
    {
      h2: 'Vad Klokka inte gör',
      body: [
        'Klokka gör inga scheman eller körlistor, har ingen stämpelklocka och ingen GPS, fakturerar inte och kör ingen lön. Klokka gör timmarna, per person och dag. Läs mer om [tidrapportering för småföretag](page:small-business).',
      ],
    },
  ],
  faq: [
    {
      q: 'Kan jag se timmar per kund?',
      a: 'Nej. Klokka räknar timmar per anställd och dag. Skriv kundens namn i anteckningen, så syns det i historiken och i CSV-exporten.',
    },
    {
      q: 'Kan städarna rapportera sina timmar själva?',
      a: 'Inte i den här versionen. Arbetsgivaren för in timmarna, och städarna ser dem i mobilen och flaggar det som är fel.',
    },
    {
      q: 'Omfattas städfirmor av kravet på personalliggare?',
      a: 'I regel inte. Städ finns inte bland de branscher som ska föra personalliggare enligt Skatteverket: bygg, fordonsservice, kropps- och skönhetsvård, livsmedels- och tobaksgrossister, restaurang och tvätteri. Rengör firman textilmattor räknas den delen dock som tvätteri. Läs mer i [personalliggare eller tidrapport](page:guide-personalliggare).',
    },
    {
      q: 'Kan en städare med två arbetsgivare använda samma app?',
      a: 'Ja. Med samma inloggning ser hen båda företagen, var för sig, och byter mellan dem i appen.',
    },
    {
      q: 'Hur får lönebyrån timmarna?',
      a: 'Exportera månaden som en CSV-fil. Den innehåller datum, anställd, timmar och anteckning och öppnas i Excel. Klokka har ingen direkt koppling till något lönesystem.',
    },
  ],
  cta: {
    title: 'Skapa din städfirma i Klokka.',
    body: 'Bjud in städarna och för in den första dagen i dag. Gratis att använda.',
    button: 'Skapa ditt företag',
  },
} as const satisfies IndustryCopy;

export const en: PageCopyOf<typeof sv> = {
  meta: {
    title: 'Hours tracking for cleaning companies | Klokka',
    description:
      "Track your cleaners' hours day by day, lock the month and export to CSV for payroll. Free to use and open source, on web and Android.",
    ogAlt: "Hours tracking for cleaning companies: your cleaners' hours, day by day.",
  },
  card: { eyebrow: 'Cleaning companies', title: "Your cleaners' hours, day by day" },
  breadcrumb: 'Cleaning companies',
  h1: 'Hours tracking for cleaning companies',
  lede: [
    "Klokka is hours tracking for cleaning companies: you log each cleaner's hours per day, and your staff see the same month on their phones, however many client sites they visited. It is free to use, open source (MIT), has no limit on employees, and works on the web and in the Android app, in English and Swedish.",
  ],
  notice: `Cleaning companies are as a rule not covered by the personalliggare (staff register) requirement: cleaning is not among the industries that must keep one under the [Swedish Tax Agency](${skvList}) rules. If the company cleans textile carpets, however, that part counts as laundry work. Read more in [personalliggare in Sweden](page:guide-personalliggare).`,
  week: {
    title: 'Blanka Städ',
    subtitle: 'Week 39, 21 to 27 September',
    label: 'Example: the week at Blanka Städ, four employees',
    caption:
      'Made-up cleaning company, illustrative numbers. Offices in the morning, stairwells in the evening, one total a day.',
  },
  sections: [
    {
      h2: 'What a week looks like at a cleaning company',
      body: [
        'Blanka Städ has four staff. Fatima cleans offices early in the morning and stairwells in the evening, and gets one total for the day. Dragan has fixed morning shifts at the same two offices. Sara does three evenings a week at one client. Ahmed does the bigger jobs and took a Saturday when a move-out clean could not wait.',
        'In Klokka there is one entry per person per day. When the day is split across two or three clients, you enter the hours as one total and put the client names in the note, so you can see where the time went.',
      ],
    },
    {
      h2: 'Hours per person, not per client',
      body: [
        'Klokka counts hours per employee per day, not per client or site. There is no per-client report and no invoicing. The note carries the client name, and it comes along in the CSV export, but the invoicing itself happens elsewhere.',
        'That is on purpose: Klokka does one thing, making sure you and your staff agree on the hours the pay is built on.',
      ],
    },
    {
      h2: 'Part time, early mornings and a second employer',
      body: [
        "Many cleaners work part time, start before the offices open and have a second job. If the other employer also uses Klokka, the employee sees both businesses with the same login, separately, and neither of you sees the other's hours. Read more about [hours tracking for hourly employees](page:hourly).",
      ],
    },
    {
      h2: 'Your staff see the same numbers',
      body: [
        'Each cleaner sees their days, weeks and month on their phone and gets a notification when hours are added, changed or removed. If Sara sees that Wednesday evening is missing, she flags the day from her phone and you add the hours. The history keeps who changed what and when.',
      ],
    },
    {
      h2: 'Pay on or off',
      body: [
        'With pay switched on, each employee gets an hourly rate and sees the amount next to the hours. Klokka does not calculate supplements for early mornings and evenings, travel time or overtime. That is done in payroll, based on your collective agreement.',
      ],
    },
    {
      h2: 'Cleaning companies and the staff register',
      body: [
        `Today the personalliggare requirement covers six industries: construction, vehicle servicing, body and beauty care, food and tobacco wholesale, restaurants and laundries. Cleaning is not one of them, and the government's bill of June 2026 ([prop. 2025/26:282](${prop}), in Swedish) proposes no new industries.`,
        `If the company cleans textile carpets, the Tax Agency counts that as laundry work, and a register must then be kept if that part is more than roughly 25 percent of turnover. What applies in other cases is in [the Tax Agency's FAQ on the personalliggare](${skvFaq}) (in Swedish). Klokka is not a personalliggare, and the difference between the register and a timesheet is explained in [personalliggare in Sweden](page:guide-personalliggare).`,
      ],
    },
    {
      h2: 'Month end',
      body: [
        'When the month is right, you lock it and export a CSV file for your payroll provider, for one person or the whole company. If you need to add up two shifts with a gap between them, there is a [work hours calculator](page:calculator), and a [timesheet template](page:template) for anyone who prefers paper.',
      ],
    },
    {
      h2: 'What Klokka does not do',
      body: [
        'Klokka does no scheduling or route planning, has no time clock and no GPS, sends no invoices and runs no payroll. Klokka does the hours, per person per day. Read more about [time tracking for small businesses](page:small-business).',
      ],
    },
  ],
  faq: [
    {
      q: 'Can I see hours per client?',
      a: 'No. Klokka counts hours per employee per day. Put the client name in the note, and it shows in the history and in the CSV export.',
    },
    {
      q: 'Can cleaners report their own hours?',
      a: 'Not in this version. The employer logs the hours, and the cleaners see them on their phones and flag what is wrong.',
    },
    {
      q: 'Do cleaning companies in Sweden need a personalliggare?',
      a: 'As a rule, no. Cleaning is not among the industries that must keep a personalliggare under the Swedish Tax Agency rules: construction, vehicle servicing, body and beauty care, food and tobacco wholesale, restaurants and laundries. Cleaning textile carpets, however, counts as laundry work. Read more in [personalliggare in Sweden](page:guide-personalliggare).',
    },
    {
      q: 'Can a cleaner with two employers use the same app?',
      a: 'Yes. With the same login they see both businesses, separately, and switch between them in the app.',
    },
    {
      q: 'How does my payroll provider get the hours?',
      a: 'Export the month as a CSV file. It holds the date, employee, hours and note, and opens in Excel. Klokka has no direct link to any payroll system.',
    },
  ],
  cta: {
    title: 'Set up your cleaning company in Klokka.',
    body: 'Invite your cleaners and log the first day today. Free to use.',
    button: 'Create your business',
  },
};
