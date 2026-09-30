import type { IndustryCopy, PageCopyOf } from './types';

// Personalliggare: docs/research/seo/gapfill.md 2a. Retail is not among Skatteverket's six industries in 2026; only
// food and tobacco wholesale is. Insights (week by week, weekday split, projected month end) and deactivation of a
// removed member with hours: openapi.yaml (getWorkspaceInsights, removeMember). No collective agreement is named.
// Fact check 2026-09-30 (CHQ-149): the food-and-drink pointer now links Skatteverket's restaurant and mixed-business
// pages (restaurants include "liknande ställen där man kan hämta mat"; the mixed-business 25 percent rule); the
// unsourced "OB often applies on evenings, Sundays and holidays" was cut.
const skvList =
  'https://www.skatteverket.se/foretag/arbetsgivare/personalliggare.4.4f3d00a710cc9ae1c9c80007271.html';
const skvRestaurant =
  'https://www.skatteverket.se/foretag/arbetsgivare/personalliggare/personalliggarerestaurang.4.4c6191e3115d2ea500880001977.html';
const skvMixed =
  'https://www.skatteverket.se/foretag/arbetsgivare/personalliggare/blandadverksamhet.4.22501d9e166a8cb399f2c99.html';

export const sv = {
  meta: {
    title: 'Tidrapportering för butik och handel | Klokka',
    description:
      'Logga butikspersonalens timmar per dag, se trender över månaden och exportera till CSV. Gratis att använda, på webben och Android.',
    ogAlt: 'Tidrapportering för butik och handel: butikspersonalens timmar per dag.',
  },
  card: { eyebrow: 'Butik och handel', title: 'Butikspersonalens timmar per dag' },
  breadcrumb: 'Butik och handel',
  h1: 'Tidrapportering för butik och handel',
  lede: [
    'Klokka är tidrapportering för butiker: du loggar butikspersonalens timmar per dag och ser månaden växa, med trender per vecka och veckodag. Klokka är gratis att använda, har öppen källkod (MIT), ingen gräns för antalet anställda och fungerar på webben och i Android-appen, på svenska och engelska.',
  ],
  notice: `Butiker omfattas i regel inte av kravet på personalliggare: detaljhandel finns inte bland de branscher som ska föra personalliggare enligt [Skatteverket](${skvList}), bara grossister i livsmedel och tobak. Läs mer i [personalliggare eller tidrapport](page:guide-personalliggare).`,
  week: {
    title: 'Butik Hörnan',
    subtitle: 'Vecka 39, 21–27 september',
    label: 'Exempel: veckan i Butik Hörnan, fyra anställda',
    caption: 'Påhittad butik, påhittade siffror. Eftermiddagar i veckan och fulla lördagar.',
  },
  sections: [
    {
      h2: 'Så ser en vecka ut i en butik',
      body: [
        'Butik Hörnan har öppet varje dag. Yusuf är butikschef och jobbar heltid måndag till fredag. Alva och Emil tar eftermiddagarna i veckan och varsin lång lördag. Maja jobbar fredagskväll och helg.',
        'Du för in timmarna per dag, eller hela veckan på en gång i rutnätet ovan. En kväll med inventering förs in som vanliga timmar med en anteckning, så att det syns i efterhand varför torsdagen blev längre.',
      ],
    },
    {
      h2: 'Se vilka dagar som bär veckan',
      body: [
        'Klokka visar månadens timmar vecka för vecka och fördelade på veckodagar, och räknar ut var månaden landar om den fortsätter i samma takt. I en butik syns det direkt att lördagen har flest timmar, och om december är på väg att dra iväg.',
        'Det är underlag för planeringen, inte ett schema. Hur många timmar en heltid är varje månad står i [arbetstid per månad](page:hours).',
      ],
    },
    {
      h2: 'Extrapersonal inför julhandeln',
      body: [
        'Bjud in extrapersonalen inför december, med namn och e-post, och för in de dagar de jobbar. Det finns ingen gräns för antalet anställda. När säsongen är över tar du bort dem: den som har timmar blir inaktiverad i stället, och timmarna finns kvar för er båda. Läs mer om [tidrapport för timanställda](page:hourly).',
      ],
    },
    {
      h2: 'Personalen ser samma siffror',
      body: [
        'Varje anställd ser sina dagar, veckor och månad i mobilen och får en notis när timmar läggs till, ändras eller tas bort. Ser Emil att lördagen står på 5 timmar när han jobbade 7, flaggar han raden, och du rättar den. Historiken sparar vem som ändrade vad och när.',
      ],
    },
    {
      h2: 'Lön på eller av, men ingen OB',
      body: [
        'Klokka räknar inte ut OB-tillägg, och inte heller övertid. Med lön påslaget ser var och en timmar gånger timlön, och eventuella tillägg räknas i lönesystemet.',
      ],
    },
    {
      h2: 'Butiker och personalliggare',
      body: [
        'Kravet på personalliggare gäller i dag sex branscher: bygg, fordonsservice, kropps- och skönhetsvård, livsmedels- och tobaksgrossister, restaurang och tvätteri. Detaljhandel finns inte med. Det är grossistledet i livsmedel och tobak som omfattas, inte butiken som säljer till kunderna.',
        `Serverar butiken också mat och dryck, eller säljer den lagad mat att hämta, läs Skatteverkets regler för [restaurang](${skvRestaurant}) och för [blandad verksamhet](${skvMixed}): är den delen mer än ungefär 25 procent av omsättningen ska personalliggare föras. Skillnaden mellan liggare och tidrapport förklaras i [personalliggare eller tidrapport](page:guide-personalliggare).`,
      ],
    },
    {
      h2: 'Månadsslut',
      body: [
        'När månaden stämmer låser du den och exporterar en CSV-fil till den som sköter lönen, för en person eller hela butiken. Behöver du räkna ihop ett pass med rast finns en [kalkylator för arbetstid](page:calculator).',
      ],
    },
    {
      h2: 'Vad Klokka inte gör',
      body: [
        'Klokka gör inga scheman, har ingen stämpelklocka, ingen koppling till kassan och kör ingen lön. Klokka gör timmarna, så att du och personalen ser samma månad. Läs mer om [tidrapportering för småföretag](page:small-business).',
      ],
    },
  ],
  faq: [
    {
      q: 'Kan Klokka räkna OB för helger?',
      a: 'Nej. Klokka visar timmar, och med lön påslaget timmar gånger timlön. OB och andra tillägg räknas i lönesystemet utifrån ert kollektivavtal.',
    },
    {
      q: 'Kan jag se vilken dag som har flest timmar?',
      a: 'Ja. Klokka visar hur månadens timmar fördelar sig på veckodagar och vecka för vecka, och var månaden landar om den fortsätter i samma takt.',
    },
    {
      q: 'Behöver en butik personalliggare?',
      a: 'I regel inte, detaljhandel finns inte bland de branscher som ska föra personalliggare enligt Skatteverket. Grossister i livsmedel och tobak omfattas däremot, och serverar butiken mat kan restaurangreglerna gälla. Läs mer i [personalliggare eller tidrapport](page:guide-personalliggare).',
    },
    {
      q: 'Kan extrapersonal i december läggas till och tas bort?',
      a: 'Ja. Bjud in dem inför säsongen och ta bort dem efteråt. Den som har timmar blir inaktiverad i stället för borttagen, så timmarna finns kvar.',
    },
    {
      q: 'Kan butikspersonalen se sina timmar?',
      a: 'Ja. Var och en ser sina dagar, veckor och månad i Android-appen eller i webbläsaren, och får en notis när något ändras.',
    },
  ],
  cta: {
    title: 'Skapa din butik i Klokka.',
    body: 'Bjud in personalen och för in den första dagen i dag. Gratis att använda.',
    button: 'Skapa ditt företag',
  },
} as const satisfies IndustryCopy;

export const en: PageCopyOf<typeof sv> = {
  meta: {
    title: 'Staff hours tracking for shops and retail | Klokka',
    description:
      'Log shop staff hours per day, see trends across the month and export to CSV. Free to use, open source, on the web and Android.',
    ogAlt: 'Staff hours tracking for shops and retail: shop staff hours, per day.',
  },
  card: { eyebrow: 'Shops and retail', title: 'Shop staff hours, per day' },
  breadcrumb: 'Shops and retail',
  h1: 'Staff hours tracking for shops and retail',
  lede: [
    "Klokka is staff hours tracking for shops: you log your staff's hours per day and watch the month add up, with trends by week and weekday. It is free to use, open source (MIT), has no limit on employees, and works on the web and in the Android app, in English and Swedish.",
  ],
  notice: `Shops are as a rule not covered by the personalliggare (staff register) requirement: retail is not among the industries that must keep one under the [Swedish Tax Agency](${skvList}) rules, only food and tobacco wholesale. Read more in [personalliggare in Sweden](page:guide-personalliggare).`,
  week: {
    title: 'Butik Hörnan',
    subtitle: 'Week 39, 21 to 27 September',
    label: 'Example: the week at Butik Hörnan, four employees',
    caption: 'Made-up shop, illustrative numbers. Weekday afternoons and full Saturdays.',
  },
  sections: [
    {
      h2: 'What a week looks like in a shop',
      body: [
        'Butik Hörnan is open every day. Yusuf is the manager and works full time, Monday to Friday. Alva and Emil take the weekday afternoons and a long Saturday each. Maja works Friday evening and the weekend.',
        'You log the hours per day, or the whole week at once in the grid above. An evening stocktake goes in as ordinary hours with a note, so it is clear later why Thursday was longer.',
      ],
    },
    {
      h2: 'See which days carry the week',
      body: [
        'Klokka shows the hours of the month week by week and split by weekday, and works out where the month lands if it carries on at the same pace. In a shop you see straight away that Saturday has the most hours, and whether December is running away.',
        'It is input for planning, not a schedule. How many hours a full-time month has is in [working hours per month](page:hours).',
      ],
    },
    {
      h2: 'Extra staff for the Christmas rush',
      body: [
        'Invite your extra staff before December, by name and email, and log the days they work. There is no limit on the number of employees. When the season is over you remove them: anyone with hours is deactivated instead, and the hours stay visible to both of you. Read more about [hours tracking for hourly employees](page:hourly).',
      ],
    },
    {
      h2: 'Your staff see the same numbers',
      body: [
        'Each employee sees their days, weeks and month on their phone and gets a notification when hours are added, changed or removed. If Emil sees Saturday at 5 hours when he worked 7, he flags the entry and you fix it. The history keeps who changed what and when.',
      ],
    },
    {
      h2: 'Pay on or off, but no unsocial-hours pay',
      body: [
        'Klokka does not calculate unsocial-hours pay (OB), nor overtime. With pay switched on, each person sees hours times their hourly rate, and any supplements are worked out in payroll.',
      ],
    },
    {
      h2: 'Shops and the staff register',
      body: [
        'Today the personalliggare requirement covers six industries: construction, vehicle servicing, body and beauty care, food and tobacco wholesale, restaurants and laundries. Retail is not one of them. It is the wholesale side of food and tobacco that is covered, not the shop selling to customers.',
        `If your shop also serves food and drink, or sells cooked food to take away, read the Tax Agency rules for [restaurants](${skvRestaurant}) and for [mixed businesses](${skvMixed}) (in Swedish): if that part is more than roughly 25 percent of turnover, a register must be kept. The difference between the register and a timesheet is explained in [personalliggare in Sweden](page:guide-personalliggare).`,
      ],
    },
    {
      h2: 'Month end',
      body: [
        'When the month is right, you lock it and export a CSV file for whoever runs payroll, for one person or the whole shop. If you need to add up a shift with a break, there is a [work hours calculator](page:calculator).',
      ],
    },
    {
      h2: 'What Klokka does not do',
      body: [
        'Klokka does no scheduling, has no time clock, no link to your till and runs no payroll. Klokka does the hours, so you and your staff see the same month. Read more about [time tracking for small businesses](page:small-business).',
      ],
    },
  ],
  faq: [
    {
      q: 'Can Klokka calculate weekend unsocial-hours pay?',
      a: 'No. Klokka shows hours, and with pay switched on, hours times the hourly rate. Unsocial-hours pay and other supplements are worked out in payroll based on your collective agreement.',
    },
    {
      q: 'Can I see which day has the most hours?',
      a: 'Yes. Klokka shows how the hours of the month split across weekdays and week by week, and where the month lands if it carries on at the same pace.',
    },
    {
      q: 'Does a shop in Sweden need a personalliggare?',
      a: 'As a rule, no, retail is not among the industries that must keep a personalliggare under Swedish Tax Agency rules. Food and tobacco wholesalers are covered, though, and if the shop serves food, the restaurant rules may apply. Read more in [personalliggare in Sweden](page:guide-personalliggare).',
    },
    {
      q: 'Can I add and remove extra staff for December?',
      a: 'Yes. Invite them before the season and remove them afterwards. Anyone with hours is deactivated instead of removed, so the hours stay.',
    },
    {
      q: 'Can shop staff see their hours?',
      a: 'Yes. Each person sees their days, weeks and month in the Android app or in the browser, and gets a notification when anything changes.',
    },
  ],
  cta: {
    title: 'Set up your shop in Klokka.',
    body: 'Invite your staff and log the first day today. Free to use.',
    button: 'Create your business',
  },
};
