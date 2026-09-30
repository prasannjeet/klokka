import type { GuideCopy, PageCopyOf } from './types';

// Facts and sources: docs/research/seo/gapfill.md sections 2b and 2c (arbetstidslagen 11, 12 and 15 §§,
// brottsbalken 14 kap. 1 §). No statute regulates an employer correcting hours directly; the page says so and
// gives no legal conclusions beyond what the linked texts state.
const atl =
  'https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/arbetstidslag-1982673_sfs-1982-673/';
const brb =
  'https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/brottsbalk-1962700_sfs-1962-700/';
const avRecords =
  'https://www.av.se/arbetsmiljoarbete-och-inspektioner/arbetsgivarens-ansvar-for-arbetsmiljon/anteckna-uppgifter-om-jourtid-overtid-och-mertid/';

export const sv = {
  meta: {
    title: 'Får arbetsgivaren ändra tidrapporten? Så fungerar det',
    description:
      'Får arbetsgivaren ändra i din tidrapport? Vad som gäller, vad du kan göra om du inte håller med och hur ändringar görs öppet för båda.',
    ogAlt: 'Guide: får arbetsgivaren ändra timmarna?',
  },
  card: { eyebrow: 'Guide', title: 'Får arbetsgivaren ändra timmarna?' },
  breadcrumb: 'Guide: ändra tidrapport',
  h1: 'Får arbetsgivaren ändra i tidrapporten?',
  lede: [
    'Ja, arbetsgivaren får rätta en tidrapport som är fel, och ingen svensk lag reglerar sådana rättelser direkt. Gränsen går vid att utan lov ändra en tidrapport som någon annan har skrivit eller skrivit under, och lönen för de timmar du faktiskt har arbetat bestäms av ditt anställningsavtal och eventuellt kollektivavtal, inte av vad som står kvar i rapporten.',
    'Den här guiden går igenom vem som ansvarar för tidrapporten, när en ändring är rimlig, vad du kan göra om du inte håller med och hur ändringar kan göras öppet, så att båda sidor vet vad som gäller.',
  ],
  sections: [
    {
      h2: 'Kort svar',
      body: ['Det här är det viktigaste, i fyra punkter:'],
      list: [
        'Arbetsgivaren får rätta fel i en tidrapport. Ingen lag förbjuder eller reglerar det direkt.',
        `Att obehörigen ändra en tidrapport som någon annan har skrivit eller skrivit under kan vara urkundsförfalskning ([brottsbalken 14 kap. 1 §](${brb})).`,
        `Du har rätt att se arbetsgivarens anteckningar om din jourtid, övertid och mertid ([arbetstidslagen 11 §](${atl})).`,
        `Ändringar i schemat, alltså när den ordinarie arbetstiden läggs, ska som huvudregel meddelas minst två veckor i förväg ([arbetstidslagen 12 §](${atl})).`,
      ],
    },
    {
      h2: 'Vem ansvarar för tidrapporten?',
      body: [
        `Enligt [arbetstidslagen 11 §](${atl}) ska arbetsgivaren föra anteckningar om jourtid, övertid och mertid. De anställda har rätt att ta del av dem, själva eller genom någon annan, och samma rätt har facket på arbetsstället. Hur anteckningarna ska föras står i Arbetsmiljöverkets regler, som [av.se beskriver](${avRecords}).`,
        'För de ordinarie timmarna ser det olika ut. På en del arbetsplatser skriver den anställda tidrapporten och chefen godkänner den. På andra, till exempel i Klokka, är det arbetsgivaren som för in timmarna och den anställda som ser dem. Vem som har skrivit rapporten spelar roll för vem som får ändra i den.',
      ],
    },
    {
      h2: 'Var går gränsen?',
      body: [
        `Brottsbalken säger att den som obehörigen ändrar eller fyller i en äkta urkund gör sig skyldig till urkundsförfalskning, om det innebär fara i bevishänseende ([brottsbalken 14 kap. 1 §](${brb})). Som urkund räknas också en elektronisk handling som är gjord för att visa något och där det går att kontrollera vem som har ställt ut den.`,
        'Det betyder att det är skillnad på att rätta sin egen anteckning och att i hemlighet ändra en rapport som den anställda har skrivit eller skrivit under. Det första är vardag. Det andra ska inte göras utan den anställdas vetskap.',
        `En närliggande fråga är om arbetsgivaren får ändra schemat. Där finns en tydlig regel: ändringar i när den ordinarie arbetstiden läggs ska meddelas minst två veckor i förväg, om inte arbetets art eller något oförutsett kräver kortare varsel ([arbetstidslagen 12 §](${atl})). Kolla ert kollektivavtal, det kan ha andra regler.`,
      ],
    },
    {
      h2: 'När en ändring är rimlig',
      body: ['De flesta ändringar är vanliga rättelser av misstag. Några typiska exempel:'],
      list: [
        'Timmarna fördes in på fel dag.',
        'Samma pass fördes in två gånger.',
        'En rast som ni kommit överens om hade inte dragits av.',
        'En siffra blev fel, till exempel 8 i stället för 6.',
      ],
    },
    {
      h2: 'När du bör reagera',
      body: [
        'Några situationer är värda att ta upp direkt, utan att du behöver dra några slutsatser om varför de uppstod:',
      ],
      list: [
        'Timmar har tagits bort utan någon förklaring.',
        'En rast har dragits av fast du inte fick ta den.',
        'Tiden avrundas nedåt gång på gång.',
        'Du ser ändringarna först när lönen redan är utbetald.',
      ],
    },
    {
      h2: 'Om du inte håller med',
      body: ['Det mesta löser sig med ett samtal. Det går lättare om du har gjort de här sakerna först:'],
      list: [
        'För egna anteckningar om vilka dagar och tider du arbetade.',
        'Be om en förklaring till ändringen, gärna skriftligt, så att ni har samma bild.',
        'Ta upp det så tidigt som möjligt, helst innan månaden stängs och lönen betalas ut.',
        'Är du med i ett fackförbund, kontakta det. Kolla också ert kollektivavtal, som kan ha egna regler och frister.',
      ],
    },
    {
      h2: 'Så blir ändringar rättvisa för båda',
      body: [
        'Oavsett verktyg gör fyra vanor att ändringar sällan blir en tvist: rätta öppet, så att den anställda får veta vad som ändrades och varför. Behåll det ursprungliga värdet och en historik över vem som ändrade vad och när. Låt den anställda invända mot en post, och reda ut det innan månaden betalas. Lås månaden när ni är överens.',
        'Det är så Klokka fungerar. Varje post har en historik som båda ser, den anställda får en notis när timmar läggs till, ändras eller tas bort, en post som ser fel ut kan flaggas direkt, och månaden låses när den stämmer. Läs mer om hur du [flaggar en rad i appen](page:app).',
      ],
    },
    {
      h2: 'För arbetsgivaren: en rutin som undviker tvister',
      body: ['Fyra saker som gör att en rättelse sällan blir en fråga:'],
      list: [
        'Säg till när du rättar något, och skriv varför.',
        'Rätta aldrig i en rapport som den anställda har skrivit under utan att prata med hen först.',
        'Visa timmarna för den anställda löpande, inte först på lönespecifikationen.',
        'Stäng månaden först när invändningarna är utredda.',
      ],
    },
  ],
  faq: [
    {
      q: 'Får arbetsgivaren ändra tidrapporten utan att säga till?',
      a: 'Ingen lag reglerar det direkt, men att i hemlighet ändra en rapport som du har skrivit eller skrivit under kan vara urkundsförfalskning. Oavsett vem som skrev rapporten är det god praxis att berätta vad som ändrades och varför. Du har också rätt att se anteckningarna om din jourtid, övertid och mertid.',
    },
    {
      q: 'Får chefen dra av rast som jag inte tog?',
      a: 'Står det en rast i rapporten som du inte fick ta, ta upp det direkt och visa dina egna anteckningar. Arbetstidslagen säger att ingen ska arbeta mer än fem timmar i följd utan rast (15 §), och hur raster räknas kan också stå i ert kollektivavtal.',
    },
    {
      q: 'Får arbetsgivaren ändra mitt schema?',
      a: 'Ja, men ändringar i när den ordinarie arbetstiden läggs ska som huvudregel meddelas minst två veckor i förväg, enligt arbetstidslagen 12 §. Kortare varsel är tillåtet när arbetets art eller något oförutsett kräver det. Kollektivavtal kan ha andra regler.',
    },
    {
      q: 'Vem kan hjälpa mig?',
      a: 'Börja med att prata med din chef. Är du med i ett fackförbund kan du vända dig dit. Den här guiden är en allmän genomgång, inte juridisk rådgivning.',
    },
    {
      q: 'Kan en anställd ändra timmarna i Klokka?',
      a: 'Nej. I Klokka för arbetsgivaren in timmarna. Den anställda flaggar en post som ser fel ut, arbetsgivaren rättar den eller avfärdar flaggan, och historiken sparar båda.',
    },
  ],
  cta: {
    title: 'Visa timmarna för båda, från början.',
    body: 'I Klokka ser den anställda varje ändring direkt, och historiken sparar vem som ändrade vad. Gratis att använda. Läs också [vad en tidrapport ska innehålla](page:guide-timesheet).',
    button: 'Skapa ditt företag',
  },
  author: 'Klokka',
  reviewed: '2026-09-30',
  sources: [
    { label: 'Arbetstidslag (1982:673), 11, 12 och 15 §§, riksdagen.se', url: atl },
    { label: 'Brottsbalk (1962:700), 14 kap. 1 §, riksdagen.se', url: brb },
    { label: 'Anteckna uppgifter om jourtid, övertid och mertid, av.se', url: avRecords },
  ],
} as const satisfies GuideCopy;

export const en: PageCopyOf<typeof sv> = {
  meta: {
    title: 'Can an employer change your timesheet in Sweden?',
    description:
      'Can your employer change the hours on your timesheet? What applies in Sweden, what to do if you disagree, and how to keep every change visible.',
    ogAlt: 'Guide: can an employer change your hours?',
  },
  card: { eyebrow: 'Guide', title: 'Can an employer change your hours?' },
  breadcrumb: 'Guide: changed hours',
  h1: 'Can an employer change the hours on your timesheet?',
  lede: [
    'Yes, in Sweden an employer may correct a timesheet that is wrong, and no Swedish statute regulates such corrections directly. The line is drawn at changing, without permission, a timesheet that someone else wrote or signed, and the pay for hours you actually worked is set by your employment contract and any collective agreement, not by what is left in the report.',
    'This guide covers who is responsible for the timesheet, when a change is reasonable, what you can do if you disagree, and how changes can be made in the open so both sides know where they stand.',
  ],
  sections: [
    {
      h2: 'The short answer',
      body: ['The essentials, in four points:'],
      list: [
        'The employer may correct mistakes in a timesheet. No Swedish law forbids or regulates it directly.',
        `Changing, without authority, a timesheet someone else wrote or signed can be forgery (urkundsförfalskning) under the [Swedish Criminal Code, chapter 14 section 1](${brb}).`,
        `You have the right to see the employer's records of your on-call time, overtime and additional hours ([Working Hours Act, section 11](${atl})).`,
        `Changes to your schedule, meaning when your ordinary hours fall, must as a rule be announced at least two weeks ahead ([Working Hours Act, section 12](${atl})).`,
      ],
    },
    {
      h2: 'Who is responsible for the timesheet?',
      body: [
        `Under [section 11 of the Working Hours Act](${atl}) (arbetstidslagen), the employer must keep records of on-call time, overtime and additional hours. Employees have the right to see them, themselves or through someone else, and so does the union at the workplace. How the records are kept is set out in the Swedish Work Environment Authority's rules, which [av.se describes](${avRecords}) (in Swedish).`,
        'For ordinary hours it varies. In some workplaces the employee writes the timesheet and the manager approves it. In others, Klokka for example, the employer logs the hours and the employee sees them. Who wrote the report matters for who may change it.',
      ],
    },
    {
      h2: 'Where is the line?',
      body: [
        `The Swedish Criminal Code says that whoever, without authority, alters or fills in a genuine document commits forgery if it puts the evidence at risk ([chapter 14 section 1](${brb})). An electronic record made to prove something, where it can be reliably checked who issued it, also counts as such a document.`,
        'So there is a difference between correcting your own record and quietly changing a report the employee wrote or signed. The first is routine. The second should not be done without the employee knowing.',
        `A related question is whether the employer may change your schedule. There is a clear rule here: changes to when your ordinary hours fall must be announced at least two weeks ahead, unless the nature of the work or something unforeseen calls for shorter notice ([Working Hours Act, section 12](${atl})). Check your collective agreement, it may have other rules.`,
      ],
    },
    {
      h2: 'When a change is reasonable',
      body: ['Most changes are ordinary corrections of mistakes. Some typical examples:'],
      list: [
        'The hours were logged on the wrong day.',
        'The same shift was logged twice.',
        'An agreed break had not been deducted.',
        'A number was wrong, for example 8 instead of 6.',
      ],
    },
    {
      h2: 'When to speak up',
      body: [
        'Some situations are worth raising straight away, without drawing any conclusions about why they happened:',
      ],
      list: [
        'Hours were removed without any explanation.',
        'A break was deducted that you did not get to take.',
        'Time is rounded down again and again.',
        'You only see the changes once the pay has already gone out.',
      ],
    },
    {
      h2: 'If you disagree',
      body: [
        'Most of it is sorted out with a conversation. It goes more easily if you have done these things first:',
      ],
      list: [
        'Keep your own notes of the days and times you worked.',
        'Ask for an explanation of the change, preferably in writing, so you share the same picture.',
        'Raise it as early as you can, ideally before the month is closed and the pay goes out.',
        'If you are a union member, contact your union. Check your collective agreement too, which may have its own rules and deadlines.',
      ],
    },
    {
      h2: 'How to make changes fair for both sides',
      body: [
        'Whatever the tool, four habits keep changes from turning into disputes: correct in the open, so the employee is told what changed and why. Keep the original value and a history of who changed what and when. Let the employee object to an entry, and sort it out before the month is paid. Lock the month once you agree.',
        'That is how Klokka works. Every entry has a history both sides can see, the employee is notified when hours are added, changed or removed, an entry that looks wrong can be flagged on the spot, and the month is locked once it is right. Read more about how to [flag an entry in the app](page:app).',
      ],
    },
    {
      h2: 'For employers: a routine that avoids disputes',
      body: ['Four things that keep a correction from becoming an issue:'],
      list: [
        'Say so when you correct something, and note why.',
        'Never correct a report the employee has signed without talking to them first.',
        'Show the employee the hours as you go, not first on the payslip.',
        'Close the month only once objections have been sorted out.',
      ],
    },
  ],
  faq: [
    {
      q: 'Can my employer change my timesheet without telling me in Sweden?',
      a: 'No law regulates it directly, but quietly changing a report you wrote or signed can be forgery. Whoever wrote the report, it is good practice to say what changed and why. You also have the right to see the records of your on-call time, overtime and additional hours.',
    },
    {
      q: 'Can my manager deduct a break I did not take?',
      a: 'If the report shows a break you did not get to take, raise it straight away and show your own notes. The Working Hours Act says no one should work more than five hours in a row without a break (section 15), and how breaks count may also be set in your collective agreement.',
    },
    {
      q: 'Can my employer change my schedule in Sweden?',
      a: 'Yes, but changes to when your ordinary hours fall must as a rule be announced at least two weeks ahead, under section 12 of the Working Hours Act. Shorter notice is allowed when the nature of the work or something unforeseen calls for it. Collective agreements may have other rules.',
    },
    {
      q: 'Who can help me?',
      a: 'Start by talking to your manager. If you are a union member, you can turn to your union. This guide is a general overview, not legal advice.',
    },
    {
      q: 'Can an employee change the hours in Klokka?',
      a: 'No. In Klokka the employer logs the hours. The employee flags an entry that looks wrong, the employer fixes it or dismisses the flag, and the history keeps both.',
    },
  ],
  cta: {
    title: 'Show both sides the hours from day one.',
    body: 'In Klokka the employee sees every change straight away, and the history keeps who changed what. Free to use. Read also [what a timesheet should contain](page:guide-timesheet).',
    button: 'Create your business',
  },
  author: 'Klokka',
  reviewed: '2026-09-30',
  sources: [
    { label: 'Working Hours Act (1982:673), sections 11, 12 and 15, riksdagen.se (Swedish)', url: atl },
    { label: 'Criminal Code (1962:700), chapter 14 section 1, riksdagen.se (Swedish)', url: brb },
    { label: 'Recording on-call time, overtime and additional hours, av.se (Swedish)', url: avRecords },
  ],
};
