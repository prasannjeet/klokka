import type { PageCopyOf, ToolCopy } from './types';

const atl =
  'https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/arbetstidslag-1982673_sfs-1982-673/';

export const sv = {
  meta: {
    title: 'Räkna ut arbetstid: gratis timräknare | Klokka',
    description:
      'Räkna ut arbetstid och timmar på sekunder. Ange start, slut och rast per dag, så summerar vi veckan. Gratis, inget konto.',
    ogAlt: 'Räkna ut arbetstid: en gratis timräknare från Klokka.',
  },
  card: { eyebrow: 'Gratis verktyg', title: 'Räkna ut arbetstid' },
  breadcrumb: 'Räkna ut arbetstid',
  h1: 'Räkna ut arbetstid och timmar',
  lede: [
    'Räkna ut arbetstiden per dag eller vecka: ange start, slut och rast så får du timmarna direkt, både i timmar och minuter och som decimaltal. Timräknaren är gratis och kräver inget konto, och vill du spara timmarna och låta de anställda se dem gör Klokka det: gratis att använda, öppen källkod (MIT), obegränsat antal anställda, på webben och i Android-appen, på svenska och engelska.',
  ],
  sections: [
    {
      h2: 'Så räknar du ut arbetstid för hand',
      body: [
        'Arbetstiden för ett pass är sluttiden minus starttiden minus rasten. Börjar du 08:30, slutar 17:00 och har 45 minuters rast blir det 8 timmar och 30 minuter minus 45 minuter, alltså 7 timmar och 45 minuter.',
        'För en vecka räknar du varje dag för sig och lägger ihop dagarna. Summera minuterna först och gör om till timmar sist, så slipper du avrundningsfel på vägen. Det är så räknaren ovan gör.',
      ],
      list: [
        'Skriv ner start- och sluttid för dagen.',
        'Räkna tiden mellan dem i timmar och minuter.',
        'Dra av rasten.',
        'Gör om till decimaltal om lönen räknas så: 7 timmar och 45 minuter är 7,75 timmar.',
      ],
    },
    {
      h2: 'Timmar och minuter som decimaltal',
      body: [
        'Lönesystem och kalkylark räknar oftast timmar som decimaltal. Dela minuterna med 60: 45 minuter är 45 / 60 = 0,75 timmar. Räknaren visar båda formerna, med decimaltalet avrundat till två decimaler.',
      ],
      list: [
        '15 minuter = 0,25 timmar',
        '20 minuter = 0,33 timmar',
        '30 minuter = 0,5 timmar',
        '40 minuter = 0,67 timmar',
        '45 minuter = 0,75 timmar',
        '50 minuter = 0,83 timmar',
      ],
    },
    {
      h2: 'Arbetspass över midnatt',
      body: [
        'Är sluttiden tidigare än starttiden räknar verktyget att passet slutar nästa dygn. Ett nattpass från 22:00 till 06:00 med 30 minuters rast blir 8 timmar minus 30 minuter, alltså 7,5 timmar. För hand gör du likadant: timmarna fram till midnatt (2) plus timmarna efter midnatt (6), minus rasten.',
      ],
    },
    {
      h2: 'Räknas rasten som arbetstid?',
      body: [
        `Nej. Enligt arbetstidslagen är en rast ett avbrott i arbetsdagen då den anställda inte behöver stanna kvar på arbetsplatsen, och ingen ska arbeta mer än fem timmar i följd utan rast ([arbetstidslagen 15 §](${atl})). Därför drar räknaren av rasten.`,
        'En paus är något annat: korta avbrott i arbetet, och pauser räknas in i arbetstiden (17 §). Detsamma gäller ett måltidsuppehåll på arbetsplatsen som ersätter rasten (16 §). Kolla ert kollektivavtal, det kan ha egna regler om raster.',
      ],
    },
    {
      h2: 'Hur många timmar har en månad?',
      body: [
        'Heltid är enligt arbetstidslagen högst 40 timmar i veckan (5 §). Hur många timmar en månad har beror på hur många vardagar och helgdagar den innehåller: 21 arbetsdagar med 8 timmar blir 168 timmar, 22 arbetsdagar blir 176 timmar. Räkna veckorna här och lägg ihop dem, eller för in timmarna i Klokka, som summerar månaden åt båda.',
      ],
    },
    {
      h2: 'Spara timmarna i stället',
      body: [
        'En räknare glömmer allt när du stänger fliken. I Klokka för arbetsgivaren in timmarna per dag och den anställda ser samma dag, vecka och månad i mobilen. Varje ändring sparas med vem och när, månaden kan låsas när den är klar och exporteras som CSV till den som sköter lönen.',
        'Klokka är gjort för [tidrapportering i småföretag](page:small-business). Föredrar du papper finns en [tidrapport mall i Excel och PDF](page:template) med samma kolumner som räknaren.',
      ],
    },
  ],
  faq: [
    {
      q: 'Hur räknar man ut arbetade timmar?',
      a: 'Sluttid minus starttid minus rast, för varje dag, och sedan summan av dagarna. 08:00 till 16:30 med 30 minuters rast är 8 timmar.',
    },
    {
      q: 'Vilken app kan jag använda för att räkna tid?',
      a: 'För en snabb summa räcker räknaren på den här sidan, den är gratis och kräver inget konto. Vill du spara timmarna varje dag och låta de anställda se dem kan du använda [Klokka](page:home), som är gratis att använda på webben och i Android-appen.',
    },
    {
      q: 'Hur skriver man 7 timmar och 45 minuter som decimaltal?',
      a: '7,75. Dela minuterna med 60 (45 / 60 = 0,75) och lägg till de hela timmarna.',
    },
    {
      q: 'Räknas rasten som arbetstid?',
      a: 'Nej. En rast är ett avbrott då den anställda får lämna arbetsplatsen, och den räknas inte in i arbetstiden. Pauser, korta avbrott i arbetet, räknas däremot in (arbetstidslagen 15 och 17 §§). Ett kollektivavtal kan ha egna regler.',
    },
    {
      q: 'Hur räknar jag ett nattpass?',
      a: 'Skriv start och slut som vanligt. Är sluttiden tidigare än starttiden räknar verktyget att passet slutar nästa dag: 22:00 till 06:00 är 8 timmar före rasten.',
    },
  ],
  cta: {
    title: 'Räkna inte om samma vecka två gånger.',
    body: 'Gratis att använda, inget kort behövs. Arbetsgivaren för in timmarna och de anställda ser samma månad.',
    button: 'Spara timmarna i Klokka',
  },
  tool: {
    title: 'Timräknare',
    mode: 'Vad vill du räkna?',
    modeWeek: 'Vecka',
    modeSpan: 'Mellan två tider',
    mon: 'Måndag',
    tue: 'Tisdag',
    wed: 'Onsdag',
    thu: 'Torsdag',
    fri: 'Fredag',
    sat: 'Lördag',
    sun: 'Söndag',
    start: 'Start',
    end: 'Slut',
    break: 'Rast (min)',
    hint: 'Skriv tider som 8, 8:30 eller 0830. Slutar passet efter midnatt räknas det till nästa dag.',
    dayTotal: 'Timmar',
    weekTotal: 'Veckan totalt',
    spanTotal: 'Arbetad tid',
    decimal: 'som decimaltal',
    clock: 'i timmar och minuter',
    wage: 'Timlön i kronor (valfritt)',
    wageNote: 'Visar bruttolönen för veckan, före skatt och utan OB, övertid eller semesterersättning.',
    payTotal: 'Lön för veckan',
    errorClock: 'Skriv tiden som 8, 8:30 eller 0830.',
    errorBreak: 'Skriv rasten i hela minuter, till exempel 30.',
    errorBreakLong: 'Rasten är längre än passet.',
    errorRate: 'Skriv timlönen som ett tal, till exempel 150 eller 150,50.',
    noScript:
      'Räknaren behöver JavaScript. Utan det räknar du så här: sluttid minus starttid minus rast, för varje dag, och sedan summan av dagarna. Exemplen står nedan.',
    saveTitle: 'Räknar du samma timmar varje vecka?',
    saveBody:
      'Spara dem i Klokka. Arbetsgivaren för in timmarna, den anställda ser dem i mobilen och månaden summeras åt båda.',
    saveButton: 'Spara det i Klokka i stället',
    templateButton: 'Ladda ner tidrapport mall',
  },
} as const satisfies ToolCopy;

export const en: PageCopyOf<typeof sv> = {
  meta: {
    title: 'Work hours calculator: daily and weekly | Klokka',
    description:
      'Work out hours worked from start, end and break times. See the day and week total instantly, in hours and decimals. Free, no account needed.',
    ogAlt: 'Work hours calculator: a free tool from Klokka.',
  },
  card: { eyebrow: 'Free tool', title: 'Work hours calculator' },
  breadcrumb: 'Work hours calculator',
  h1: 'Work hours calculator',
  lede: [
    'Work out hours worked per day or week: enter start, end and break and get the total straight away, in hours and minutes and as a decimal. The calculator is free with no account, and to keep the hours and let your staff see them, Klokka does that: free to use, open source (MIT), no limit on employees, on the web and in the Android app, in English and Swedish.',
  ],
  sections: [
    {
      h2: 'How to calculate hours worked by hand',
      body: [
        'The hours of a shift are the end time minus the start time minus the break. Start at 08:30, finish at 17:00 with a 45 minute lunch break, and that is 8 hours 30 minutes minus 45 minutes: 7 hours 45 minutes.',
        'For a week, work out each day on its own and add the days up. Add the minutes first and convert to hours last, so no rounding creeps in along the way. That is what the calculator above does.',
      ],
      list: [
        'Write down the start and end time of the day.',
        'Work out the time between them in hours and minutes.',
        'Take off the break.',
        'Convert to a decimal if pay is calculated that way: 7 hours 45 minutes is 7.75 hours.',
      ],
    },
    {
      h2: 'Minutes as decimal hours',
      body: [
        'Payroll systems and spreadsheets usually count hours as decimals. Divide the minutes by 60: 45 minutes is 45 / 60 = 0.75 hours. The calculator shows both, with the decimal rounded to two places.',
      ],
      list: [
        '15 minutes = 0.25 hours',
        '20 minutes = 0.33 hours',
        '30 minutes = 0.5 hours',
        '40 minutes = 0.67 hours',
        '45 minutes = 0.75 hours',
        '50 minutes = 0.83 hours',
      ],
    },
    {
      h2: 'Shifts past midnight',
      body: [
        'When the end time is earlier than the start time, the calculator counts the shift into the next day. A night shift from 22:00 to 06:00 with a 30 minute break is 8 hours minus 30 minutes: 7.5 hours. By hand it is the same: the hours up to midnight (2) plus the hours after midnight (6), minus the break.',
      ],
    },
    {
      h2: 'Is a break counted as working time?',
      body: [
        `Not in Sweden. Under the Working Hours Act a break (rast) is an interruption of the working day during which the employee does not have to stay at the workplace, and nobody should work more than five hours in a row without one ([Arbetstidslagen, section 15](${atl}), in Swedish). That is why the calculator subtracts it.`,
        'A pause is something else: short interruptions in the work, and pauses count as working time (section 17). So does a meal break taken at the workplace in place of a proper break (section 16). Check your collective agreement, which may set its own rules on breaks.',
      ],
    },
    {
      h2: 'How many hours are in a working month?',
      body: [
        'Full time under the Swedish Working Hours Act is at most 40 hours a week (section 5). The hours in a month depend on how many weekdays and public holidays it has: 21 working days of 8 hours make 168 hours, 22 working days make 176 hours. Add up the weeks here, or log the hours in Klokka, which adds up the month for both sides.',
      ],
    },
    {
      h2: 'Keep the hours instead',
      body: [
        'A calculator forgets everything when you close the tab. In Klokka the employer logs the hours per day and the employee sees the same day, week and month on their phone. Every change is kept with who and when, the month can be locked when it is done and exported as CSV for whoever runs the pay.',
        'Klokka is made for [time tracking in a small business](page:small-business). If you prefer paper, there is a [timesheet template in Excel and PDF](page:template) with the same columns as the calculator.',
      ],
    },
  ],
  faq: [
    {
      q: 'How do I calculate hours worked?',
      a: 'End time minus start time minus the break, for each day, then add the days up. 08:00 to 16:30 with a 30 minute break is 8 hours.',
    },
    {
      q: 'How do I calculate hours with a lunch break?',
      a: 'Enter the lunch break in minutes in the break field and the calculator takes it off the shift. By hand: work out the time from start to end, then subtract the break.',
    },
    {
      q: 'How do I convert minutes to decimal hours?',
      a: 'Divide the minutes by 60 and add the whole hours: 7 hours 45 minutes is 7 + 45 / 60 = 7.75 hours.',
    },
    {
      q: 'Is a break counted as working time in Sweden?',
      a: 'No. A break (rast) is an interruption during which the employee may leave the workplace, and it is not working time. Pauses, short interruptions in the work, are (Working Hours Act, sections 15 and 17). A collective agreement may have its own rules.',
    },
    {
      q: 'How do I calculate a night shift?',
      a: 'Enter the start and end as usual. When the end is earlier than the start, the calculator counts the shift as ending the next day: 22:00 to 06:00 is 8 hours before the break.',
    },
  ],
  cta: {
    title: 'Stop working out the same week twice.',
    body: 'Free to use, no card needed. The employer logs the hours and each employee sees the same month.',
    button: 'Keep the hours in Klokka',
  },
  tool: {
    title: 'Hours calculator',
    mode: 'What do you want to work out?',
    modeWeek: 'Week',
    modeSpan: 'Between two times',
    mon: 'Monday',
    tue: 'Tuesday',
    wed: 'Wednesday',
    thu: 'Thursday',
    fri: 'Friday',
    sat: 'Saturday',
    sun: 'Sunday',
    start: 'Start',
    end: 'End',
    break: 'Break (min)',
    hint: 'Type times as 8, 8:30 or 0830. A shift that ends after midnight counts into the next day.',
    dayTotal: 'Hours',
    weekTotal: 'Week total',
    spanTotal: 'Time worked',
    decimal: 'as a decimal',
    clock: 'in hours and minutes',
    wage: 'Hourly wage in SEK (optional)',
    wageNote:
      'Shows the gross pay for the week, before tax and without unsocial hours, overtime or holiday pay.',
    payTotal: 'Pay for the week',
    errorClock: 'Type the time as 8, 8:30 or 0830.',
    errorBreak: 'Type the break in whole minutes, for example 30.',
    errorBreakLong: 'The break is longer than the shift.',
    errorRate: 'Type the wage as a number, for example 150 or 150.50.',
    noScript:
      'The calculator needs JavaScript. Without it, work it out like this: end time minus start time minus the break, for each day, then add the days up. The examples are below.',
    saveTitle: 'Working out the same hours every week?',
    saveBody:
      'Keep them in Klokka. The employer logs the hours, the employee sees them on their phone and the month adds up for both.',
    saveButton: 'Keep it in Klokka instead',
    templateButton: 'Download the timesheet template',
  },
};
