import type { PageCopyBase, PageCopyOf } from './types';

// Fact check 2026-09-30 (CHQ-149) against the law texts on riksdagen.se. Arbetstidslagen: no separate rule for hourly
// staff (1 §); limits 5, 8, 10, 10 b, 13 and 14 §§ (allmän mertid has only the yearly cap in 10 §). Semesterlagen:
// 16 § andra stycket 1 (pay not set per week or month uses the percentage rule), 16 b § (twelve percent of förfallen
// lön in the qualifying year), 5 §, 28 § and 2 a § (collective agreements may deviate from 16 to 16 b §§). No sick-pay
// rules here: they were not verified, so the page only says Klokka does not calculate them.
const atl =
  'https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/arbetstidslag-1982673_sfs-1982-673/';
const semL =
  'https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/semesterlag-1977480_sfs-1977-480/';

export const sv = {
  meta: {
    title: 'Tidrapport för timanställda, samma siffror för båda | Klokka',
    description:
      'Timanställda ser varje dag du loggat, får en notis vid ändring och kan flagga fel. Visa lön per timme om du vill. Gratis att använda.',
    ogAlt: 'Tidrapport för timanställda: timmarna, synliga för båda.',
  },
  card: { eyebrow: 'För timanställda', title: 'Timmarna, synliga för båda' },
  breadcrumb: 'För timanställda',
  h1: 'Tidrapport för timanställda',
  lede: [
    'Med Klokka loggar arbetsgivaren de timanställdas timmar per dag, och varje timanställd ser samma månad i mobilen, får en notis när något ändras och kan flagga en rad som är fel. Klokka är gratis att använda, har öppen källkod under MIT-licens, ingen gräns för antalet anställda och fungerar på webben och i Android-appen, på svenska och engelska.',
    'Klokka räknar inte ut lönen åt dig. Klokka ser till att timmarna som lönen bygger på är desamma för dig och för den som har jobbat dem.',
  ],
  sections: [
    {
      h2: 'När lönen är timmarna',
      body: [
        'För en timanställd är timmarna lönen. En timme som saknas i rapporten saknas också på lönespecifikationen, och det märks oftast först när lönen redan är betald. Då blir det frågor, rättelser och en extra utbetalning.',
        'I Klokka ser den timanställda varje dag du för in, samma dag. Stämmer något inte flaggar hen raden direkt, och ni reder ut det medan alla fortfarande minns veckan. När månaden ska stängas är ni redan överens.',
      ],
    },
    {
      h2: 'Timlön på eller av',
      body: [
        'Lön är ett reglage för hela företaget, och det är av från början. Slår du på det får varje anställd en egen timlön och ser beloppet bredvid timmarna, per dag, vecka och månad. Den som inte har någon timlön ser bara timmar.',
        'Klokka multiplicerar timmar med timlön, inget mer. OB, övertidsersättning, semesterersättning och skatt räknas i lönesystemet eller av den som sköter lönen.',
      ],
    },
    {
      h2: 'Två arbetsgivare, en app',
      body: [
        'Många timanställda jobbar på mer än ett ställe. Använder båda arbetsgivarna Klokka ser den anställda båda företagen med samma inloggning och byter mellan dem i appen. Timmarna hålls isär, och ingen av arbetsgivarna ser den andras.',
      ],
    },
    {
      h2: 'Extrapersonal som jobbar ibland',
      body: [
        'Bjud in extrapersonalen en gång, med namn och e-post, och för bara in de dagar de faktiskt jobbar. Det finns ingen gräns för antalet anställda, så den som bara hoppar in i december eller under sommaren kan ligga kvar hela året.',
        'Tar du bort en anställd som redan har timmar blir hen inaktiverad i stället, och timmarna finns kvar för er båda.',
      ],
    },
    {
      h2: 'Vad arbetsgivaren behöver veta om timanställda',
      body: [
        `Arbetstidslagen gäller för timanställda precis som för andra anställda, och det finns inget särskilt timtak för dem. Ordinarie arbetstid är högst 40 timmar i veckan (5 §). Allmän övertid får vara högst 48 timmar under fyra veckor eller 50 timmar under en kalendermånad och högst 200 timmar under ett kalenderår (8 §), och allmän mertid högst 200 timmar under ett kalenderår (10 §). Den sammanlagda arbetstiden får vara högst 48 timmar per sjudagarsperiod i genomsnitt under högst fyra månader (10 b §). Dessutom gäller 11 timmars dygnsvila och 36 timmars veckovila (13 och 14 §§, [arbetstidslagen](${atl})). Mer finns i guiden om [arbetstidslagen för arbetsgivare](page:guide-working-hours-act), och hur många timmar en heltid är varje månad står i [arbetstid per månad](page:hours).`,
        `Den som har timlön, alltså lön som inte är bestämd per vecka eller månad, får semesterlön enligt procentregeln: tolv procent av den lön som har förfallit till betalning under intjänandeåret ([semesterlagen 16 och 16 b §§](${semL})). Kollektivavtal kan ha andra regler (2 a §). Är anställningen tänkt att pågå högst tre månader, och varar den inte längre, får ni avtala att ingen semester läggs ut, och då har den anställda rätt till semesterersättning i stället (5 §). Slutar anställningen innan intjänad semesterlön är utbetald betalas den ut som semesterersättning (28 §).`,
        'Klokka räknar inte ut övertid, mertid, sjuklön eller semesterersättning. Klokka håller timmarna, och de är underlaget för allt det där. Kolla ert kollektivavtal, det kan ha andra gränser och ge mer än lagen.',
      ],
    },
    {
      h2: 'Månadsslut',
      body: [
        'När månaden stämmer låser du den. Då går det inte att ändra något förrän du låser upp den igen, och de anställda får veta att månaden är stängd. Sedan exporterar du månaden som en CSV-fil, för en person eller hela företaget, till den som sköter lönen.',
        'Behöver du räkna ihop ett pass med rast först finns en [kalkylator för arbetstid](page:calculator).',
      ],
    },
    {
      h2: 'Vad Klokka inte gör',
      body: [
        'Klokka gör inga scheman, har ingen stämpelklocka och kör ingen lön. De anställda kan inte föra in egna timmar i den här versionen, de ser timmarna och flaggar det som är fel.',
        'Klokka används av [småföretag](page:small-business) i många branscher, till exempel [café och restaurang](page:trade-cafe), [städfirmor](page:trade-cleaning), [frisörer och salonger](page:trade-salon) och [butiker](page:trade-shop).',
      ],
    },
  ],
  faq: [
    {
      q: 'Hur många timmar får en timanställd jobba i månaden?',
      a: 'Det finns inget särskilt tak för timanställda, arbetstidslagen gäller som för alla andra. Ordinarie arbetstid är högst 40 timmar i veckan. Allmän övertid får vara högst 50 timmar under en kalendermånad (eller 48 timmar under fyra veckor) och 200 timmar under ett år, och allmän mertid högst 200 timmar under ett år. Kollektivavtal kan ha andra gränser. Se [arbetstidslagen för arbetsgivare](page:guide-working-hours-act).',
    },
    {
      q: 'Har timanställda rätt till semesterersättning?',
      a: 'Ja. Med timlön räknas semesterlönen enligt procentregeln, tolv procent av den lön som har förfallit till betalning under intjänandeåret (semesterlagen 16 b §), och slutar anställningen innan intjänad semesterlön är utbetald får den anställda semesterersättning (28 §). Kollektivavtal kan ha andra regler. Klokka räknar inte ut den, men timmarna i Klokka är underlaget.',
    },
    {
      q: 'Kan en timanställd se sina timmar i Klokka?',
      a: 'Ja. När du har bjudit in hen ser hen sina dagar, veckor och månader i appen eller på webben, och får en notis när timmar läggs till, ändras eller tas bort.',
    },
    {
      q: 'Kan en timanställd ha två arbetsgivare i Klokka?',
      a: 'Ja. Med samma inloggning ser hen båda företagen, var för sig, och byter mellan dem i appen.',
    },
    {
      q: 'Kan timanställda föra in sina egna timmar?',
      a: 'Inte i den här versionen. Arbetsgivaren för in timmarna och den anställda flaggar en rad som är fel. Läs mer om vad som gäller när [arbetsgivaren ändrar i tidrapporten](page:guide-change).',
    },
  ],
  cta: {
    title: 'Visa timmarna för dem som får betalt för dem.',
    body: 'Skapa ditt företag och bjud in de timanställda. Gratis att använda. Se också [hur appen ser ut](page:app).',
    button: 'Skapa ditt företag',
  },
} as const satisfies PageCopyBase;

export const en: PageCopyOf<typeof sv> = {
  meta: {
    title: 'Track employee hours for hourly staff | Klokka',
    description:
      'Hourly staff see every day you log, get a notification when it changes and can flag a mistake. Show pay per hour if you want. Free to use.',
    ogAlt: 'Hours tracking for hourly employees: hours both sides can see.',
  },
  card: { eyebrow: 'Hourly staff', title: 'Hours both sides can see' },
  breadcrumb: 'Hourly staff',
  h1: 'Hours tracking for hourly employees',
  lede: [
    "With Klokka the employer logs hourly staff's hours per day, and each employee sees the same month on their phone, is notified when anything changes and can flag an entry that is wrong. It is free to use, open source under the MIT licence, has no limit on employees, and works on the web and in the Android app, in English and Swedish.",
    'Klokka does not calculate the pay for you. It makes sure the hours the pay is built on are the same for you and for the person who worked them.',
  ],
  sections: [
    {
      h2: 'When the pay is the hours',
      body: [
        'For hourly staff, the hours are the pay. An hour missing from the report is also missing from the payslip, and that usually shows only after the pay has gone out. Then come the questions, the corrections and an extra payment.',
        'In Klokka, hourly staff see every day you log, the same day. If something is off they flag the entry straight away, and you sort it out while everyone still remembers the week. By the time the month closes, you already agree.',
      ],
    },
    {
      h2: 'Hourly pay on or off',
      body: [
        'Pay is a switch for the whole business, and it starts off. Switch it on and each employee gets their own hourly rate and sees the amount next to the hours, per day, week and month. Anyone without a rate sees hours only.',
        'Klokka multiplies hours by the hourly rate, nothing more. Unsocial-hours pay, overtime pay, holiday pay and tax are worked out in the payroll system or by whoever runs payroll.',
      ],
    },
    {
      h2: 'Two employers, one app',
      body: [
        "Many hourly workers work in more than one place. If both employers use Klokka, the employee sees both businesses with the same login and switches between them in the app. The hours stay separate, and neither employer sees the other's.",
      ],
    },
    {
      h2: 'Extra staff who work now and then',
      body: [
        'Invite your extra staff once, by name and email, and log only the days they actually work. There is no limit on the number of employees, so someone who only helps out in December or over the summer can stay on the list all year.',
        'If you remove an employee who already has hours, they are deactivated instead, and the hours stay visible to both of you.',
      ],
    },
    {
      h2: 'What employers in Sweden should know about hourly staff',
      body: [
        `The Swedish Working Hours Act applies to hourly staff just as to any other employee, and there is no separate cap for them. Ordinary hours are at most 40 a week (section 5). General overtime is capped at 48 hours over four weeks or 50 in a calendar month and at 200 in a calendar year (section 8), and general additional hours at 200 in a calendar year (section 10). Total working time may be at most 48 hours per seven-day period on average over at most four months (section 10 b). On top of that come 11 hours of daily rest and 36 hours of weekly rest (sections 13 and 14, [the Act, in Swedish](${atl})). There is more in the guide to the [Swedish Working Hours Act](page:guide-working-hours-act), and how many hours a full-time month has is in [working hours per month](page:hours).`,
        `Staff on hourly pay, meaning pay not set per week or month, get holiday pay under the percentage rule: twelve percent of the pay that fell due in the qualifying year ([Annual Leave Act, sections 16 and 16 b](${semL}), in Swedish). Collective agreements may have other rules (section 2 a). If the employment is meant to last at most three months and does not last longer, you can agree that no leave is scheduled, and the employee is then entitled to holiday compensation instead (section 5). If the employment ends before earned holiday pay has been paid, it is paid out as holiday compensation (section 28).`,
        'Klokka does not calculate overtime, additional hours, sick pay or holiday pay. It holds the hours, and they are the basis for all of that. Check your collective agreement, it may set other limits and give more than the law.',
      ],
    },
    {
      h2: 'Month end',
      body: [
        'When the month is right, you lock it. Nothing can be changed until you unlock it again, and your staff are told the month is closed. Then you export the month as a CSV file, for one person or the whole business, for whoever runs payroll.',
        'If you need to add up a shift with a break first, there is a [work hours calculator](page:calculator).',
      ],
    },
    {
      h2: 'What Klokka does not do',
      body: [
        'Klokka does no scheduling, has no time clock and runs no payroll. Staff cannot log their own hours in this version, they see the hours and flag what is wrong.',
        'Klokka is used by [small businesses](page:small-business) in many trades, for example [cafés and restaurants](page:trade-cafe), [cleaning companies](page:trade-cleaning), [hair and beauty salons](page:trade-salon) and [shops](page:trade-shop).',
      ],
    },
  ],
  faq: [
    {
      q: 'How many hours may an hourly employee work in a month in Sweden?',
      a: 'There is no separate cap for hourly staff, the Working Hours Act applies as for everyone else. Ordinary hours are at most 40 a week. General overtime may be at most 50 hours in a calendar month (or 48 over four weeks) and 200 in a year, and general additional hours at most 200 in a year. Collective agreements may set other limits. See the [Swedish Working Hours Act for employers](page:guide-working-hours-act).',
    },
    {
      q: 'Do hourly employees get holiday pay in Sweden?',
      a: 'Yes. With hourly pay, holiday pay follows the percentage rule, twelve percent of the pay that fell due in the qualifying year (Annual Leave Act, section 16 b), and if the employment ends before earned holiday pay has been paid, the employee gets holiday compensation (section 28). Collective agreements may have other rules. Klokka does not calculate it, but the hours in Klokka are the basis.',
    },
    {
      q: 'Can an hourly employee see their hours in Klokka?',
      a: 'Yes. Once you have invited them, they see their days, weeks and months in the app or on the web, and get a notification when hours are added, changed or removed.',
    },
    {
      q: 'Can an hourly employee have two employers in Klokka?',
      a: 'Yes. With the same login they see both businesses, separately, and switch between them in the app.',
    },
    {
      q: 'Can hourly staff log their own hours?',
      a: 'Not in this version. The employer logs the hours and the employee flags an entry that is wrong. Read more about what applies when [an employer changes the hours](page:guide-change).',
    },
  ],
  cta: {
    title: 'Show the hours to the people paid for them.',
    body: 'Create your business and invite your hourly staff. Free to use. See also [what the app looks like](page:app).',
    button: 'Create your business',
  },
};
