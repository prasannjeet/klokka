import type { IndustryCopy, PageCopyOf } from './types';

// Personalliggare facts: docs/research/seo/gapfill.md 2a (Skatteverket counts caféer as restaurangverksamhet; the
// exemption when only the owner and close family work there; what the ledger records). No collective agreement is
// named: the names were not verified. Fact check 2026-09-30 (CHQ-149): skatteverket.se restaurant page wording
// ("pizzabutiker"), the exemptions and the ledger contents re-read; no change beyond that word.
const skvRestaurant =
  'https://www.skatteverket.se/foretag/arbetsgivare/personalliggare/personalliggarerestaurang.4.4c6191e3115d2ea500880001977.html';

export const sv = {
  meta: {
    title: 'Tidrapportering för café och restaurang | Klokka',
    description:
      'Logga timmarna för kök och servering per dag och se månaden växa. Personalen ser samma siffror. Gratis att använda, öppen källkod.',
    ogAlt: 'Tidrapportering för café och restaurang: timmarna för kök och servering.',
  },
  card: { eyebrow: 'Café och restaurang', title: 'Timmarna för kök och servering' },
  breadcrumb: 'Café och restaurang',
  h1: 'Tidrapportering för café och restaurang',
  lede: [
    'Klokka är tidrapportering för café och restaurang: du loggar timmarna för kök och servering per dag, och personalen ser samma månad i mobilen. Klokka är gratis att använda, har öppen källkod (MIT), ingen gräns för antalet anställda och fungerar på webben och i Android-appen, på svenska och engelska.',
  ],
  notice: `Klokka ersätter inte en personalliggare. Caféer och restauranger omfattas av kravet på personalliggare enligt Skatteverket, och den förs vid sidan av tidrapporten. Läs mer i [personalliggare eller tidrapport](page:guide-personalliggare) och hos [Skatteverket](${skvRestaurant}).`,
  week: {
    title: 'Café Linden',
    subtitle: 'Vecka 39, 21–27 september',
    label: 'Exempel: veckan på Café Linden, fyra anställda',
    caption:
      'Påhittat café, påhittade siffror. Köket öppnar tidigt, serveringen stänger sent och helgerna är fulla.',
  },
  sections: [
    {
      h2: 'Så ser en vecka ut på ett café',
      body: [
        'Café Linden har fyra anställda. Elin öppnar köket fyra morgnar i veckan och tar lördagens brunch. Omar jobbar kvällarna i serveringen, tisdag till söndag. Linnea pluggar och tar fredagskvällen och helgen. Kevin täcker luncherna i början av veckan och jobbar hela helgen.',
        'Ägaren för in timmarna på kvällen, eller en gång i veckan i rutnätet ovan. Ett delat pass, lunch och kväll samma dag, förs in som en summa för dagen med en anteckning om passen. Blev det inventering efter stängning skrivs det också i anteckningen, så att timmen går att förklara i efterhand.',
      ],
    },
    {
      h2: 'Helger, högtider och extrapersonal',
      body: [
        'På ett café är helgen ofta veckans längsta dagar, och kring jul, studenten och sommaren behövs fler händer. Bjud in extrapersonalen en gång, med namn och e-post, och för bara in de dagar de faktiskt jobbar. Det finns ingen gräns för antalet anställda, så den som hoppar in två helger om året kan ligga kvar.',
        'Många i serveringen är timanställda eller jobbar på fler ställen. Läs mer om [tidrapport för timanställda](page:hourly).',
      ],
    },
    {
      h2: 'Personalen ser samma siffror',
      body: [
        'Varje anställd ser sina dagar, veckor och månad i mobilen och får en notis när timmar läggs till, ändras eller tas bort. Ser Omar att söndagen står på 4 timmar när han stängde efter 6, flaggar han raden. Du rättar den eller svarar, och historiken sparar vem som ändrade vad och när.',
      ],
    },
    {
      h2: 'Lön på eller av, men ingen OB',
      body: [
        'Slår du på lön får varje anställd en timlön och ser beloppet bredvid timmarna. Klokka räknar inte ut OB-tillägg för kvällar och helger, och inte heller övertid. Det görs i lönesystemet, utifrån ert kollektivavtal.',
      ],
    },
    {
      h2: 'Personalliggaren är en egen sak',
      body: [
        'Skatteverket räknar caféer, gatukök, pizzabutiker och catering till restaurangbranschen, och restaurangbranschen ska föra personalliggare. Den ska visa namn och personnummer på alla som arbetar och när varje pass börjar och slutar, antecknat när det händer. Undantag finns, bland annat när bara ägaren och den närmaste familjen arbetar i verksamheten.',
        'Klokka för in timmarna i efterhand och sparar inga personnummer, så Klokka ersätter inte en personalliggare. Du behöver båda: personalliggaren för Skatteverket och tidrapporten för lönen. Skillnaden förklaras i [personalliggare eller tidrapport](page:guide-personalliggare).',
      ],
    },
    {
      h2: 'Månadsslut',
      body: [
        'När månaden stämmer låser du den. Sedan exporterar du en CSV-fil till den som sköter lönen, för en person eller hela caféet, och filen öppnas direkt i Excel. Börjar du hellre på papper finns en [tidrapport mall](page:template) att skriva ut.',
      ],
    },
    {
      h2: 'Vad Klokka inte gör',
      body: [
        'Klokka gör inga scheman, har ingen stämpelklocka, ingen koppling till kassasystemet och kör ingen lön. Klokka är inte en personalliggare. Klokka gör timmarna, så att du och personalen ser samma månad. Läs mer om [tidrapportering för småföretag](page:small-business).',
      ],
    },
  ],
  faq: [
    {
      q: 'Behöver ett café personalliggare?',
      a: `Ja, i regel. Skatteverket räknar caféer som restaurangverksamhet, och restaurangbranschen ska föra personalliggare. Undantag finns, till exempel när bara ägaren och den närmaste familjen arbetar där. Klokka är ingen personalliggare. Läs mer hos [Skatteverket](${skvRestaurant}) och i [personalliggare eller tidrapport](page:guide-personalliggare).`,
    },
    {
      q: 'Kan Klokka räkna OB-tillägg?',
      a: 'Nej. Klokka visar timmar, och med lön påslaget timmar gånger timlön. OB och andra tillägg räknas i lönesystemet.',
    },
    {
      q: 'Kan personalen stämpla in?',
      a: 'Nej, Klokka har ingen stämpelklocka. Du för in timmarna per dag och personalen ser dem direkt i mobilen.',
    },
    {
      q: 'Passar Klokka för extrapersonal?',
      a: 'Ja. Bjud in dem en gång och för in de dagar de jobbar. Det finns ingen gräns för antalet anställda.',
    },
    {
      q: 'Hur får lönen timmarna?',
      a: 'Exportera månaden som en CSV-fil och lämna den till den som sköter lönen. Klokka har ingen direkt koppling till något lönesystem.',
    },
  ],
  cta: {
    title: 'Skapa ditt café i Klokka.',
    body: 'Fem minuter från registreringen till det första passet. Gratis att använda.',
    button: 'Skapa ditt företag',
  },
} as const satisfies IndustryCopy;

export const en: PageCopyOf<typeof sv> = {
  meta: {
    title: 'Staff hours tracking for cafés and restaurants | Klokka',
    description:
      'Log kitchen and floor staff hours per day and watch the month add up. Your staff see the same numbers. Free to use and open source.',
    ogAlt: 'Staff hours tracking for cafés and restaurants: kitchen and floor hours.',
  },
  card: { eyebrow: 'Cafés, restaurants', title: 'Hours for kitchen and floor staff' },
  breadcrumb: 'Cafés and restaurants',
  h1: 'Staff hours tracking for cafés and restaurants',
  lede: [
    'Klokka is staff hours tracking for cafés and restaurants: you log kitchen and floor hours per day, and your staff see the same month on their phones. It is free to use, open source (MIT), has no limit on employees, and works on the web and in the Android app, in English and Swedish.',
  ],
  notice: `Klokka does not replace a personalliggare, the staff register some Swedish trades must keep. Cafés and restaurants are covered by that requirement under Swedish Tax Agency rules, and the register is kept alongside the timesheet. Read more in [personalliggare in Sweden](page:guide-personalliggare) and at [Skatteverket](${skvRestaurant}) (in Swedish).`,
  week: {
    title: 'Café Linden',
    subtitle: 'Week 39, 21 to 27 September',
    label: 'Example: the week at Café Linden, four employees',
    caption:
      'Made-up café, illustrative numbers. The kitchen opens early, the floor closes late and weekends are full.',
  },
  sections: [
    {
      h2: 'What a week looks like at a café',
      body: [
        'Café Linden has four staff. Elin opens the kitchen four mornings a week and does the Saturday brunch. Omar works evenings on the floor, Tuesday to Sunday. Linnea is a student and takes the Friday evening and the weekend. Kevin covers the lunches early in the week and works the whole weekend.',
        'The owner logs the hours in the evening, or once a week in the grid above. A split shift, lunch and evening on the same day, goes in as one total for the day with a note about the shifts. If there was a stocktake after closing, that goes in the note too, so the hour can be explained later.',
      ],
    },
    {
      h2: 'Weekends, holidays and extra staff',
      body: [
        'At a café the weekend is often the longest part of the week, and around Christmas, graduations and the summer you need more hands. Invite your extra staff once, by name and email, and log only the days they actually work. There is no limit on the number of employees, so someone who helps out two weekends a year can stay on the list.',
        'Many floor staff are paid by the hour or work in more than one place. Read more about [hours tracking for hourly employees](page:hourly).',
      ],
    },
    {
      h2: 'Your staff see the same numbers',
      body: [
        'Each employee sees their days, weeks and month on their phone and gets a notification when hours are added, changed or removed. If Omar sees Sunday at 4 hours when he closed after 6, he flags the entry. You fix it or reply, and the history keeps who changed what and when.',
      ],
    },
    {
      h2: 'Pay on or off, but no unsocial-hours pay',
      body: [
        'Switch pay on and each employee gets an hourly rate and sees the amount next to the hours. Klokka does not calculate unsocial-hours supplements (OB) for evenings and weekends, nor overtime. That is done in payroll, based on your collective agreement.',
      ],
    },
    {
      h2: 'The staff register is a separate thing',
      body: [
        'The Swedish Tax Agency counts cafés, street kitchens, pizza takeaways and catering as part of the restaurant trade, and the restaurant trade must keep a personalliggare. It records the name and personal identity number of everyone working, and when each shift starts and ends, noted as it happens. There are exemptions, for example when only the owner and close family work in the business.',
        'Klokka records hours after the fact and stores no identity numbers, so Klokka does not replace a personalliggare. You need both: the register for the Tax Agency and the timesheet for pay. The difference is explained in [personalliggare in Sweden](page:guide-personalliggare).',
      ],
    },
    {
      h2: 'Month end',
      body: [
        'When the month is right, you lock it. Then you export a CSV file for whoever runs payroll, for one person or the whole café, and the file opens directly in Excel. If you would rather start on paper, there is a [timesheet template](page:template) to print.',
      ],
    },
    {
      h2: 'What Klokka does not do',
      body: [
        'Klokka does no scheduling, has no time clock, no link to your till system and runs no payroll. It is not a personalliggare. Klokka does the hours, so you and your staff see the same month. Read more about [time tracking for small businesses](page:small-business).',
      ],
    },
  ],
  faq: [
    {
      q: 'Does a café in Sweden need a personalliggare?',
      a: `As a rule, yes. The Swedish Tax Agency counts cafés as restaurant businesses, and the restaurant trade must keep a personalliggare. There are exemptions, for example when only the owner and close family work there. Klokka is not a personalliggare. Read more at [Skatteverket](${skvRestaurant}) (in Swedish) and in [personalliggare in Sweden](page:guide-personalliggare).`,
    },
    {
      q: 'Can Klokka calculate unsocial-hours pay?',
      a: 'No. Klokka shows hours, and with pay switched on, hours times the hourly rate. Unsocial-hours pay and other supplements are worked out in payroll.',
    },
    {
      q: 'Can staff clock in?',
      a: 'No, Klokka has no time clock. You log the hours per day and your staff see them straight away on their phones.',
    },
    {
      q: 'Does Klokka work for extra staff?',
      a: 'Yes. Invite them once and log the days they work. There is no limit on the number of employees.',
    },
    {
      q: 'How does payroll get the hours?',
      a: 'Export the month as a CSV file and hand it to whoever runs payroll. Klokka has no direct link to any payroll system.',
    },
  ],
  cta: {
    title: 'Set up your café in Klokka.',
    body: 'Five minutes from sign-up to the first logged shift. Free to use.',
    button: 'Create your business',
  },
};
