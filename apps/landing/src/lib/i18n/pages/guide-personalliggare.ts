import type { GuideCopy, PageCopyOf } from './types';

// Fact check 2026-09-30 (CHQ-149) against the primary texts: skatteverket.se (the six industries, exemptions, mixed
// business, content, retention, control fee; the FAQ: carpet cleaning counts as tvätteriverksamhet), skatteförfarandelagen
// 39 kap. 11, 11 a and 12 §§ and 50 kap. 3 and 4 §§ (control fee amounts), prop. 2025/26:282 (summary, 7.1 to 7.6,
// in force 2027-01-01 proposed) and its status on riksdagen.se ("Propositionen bereds i utskott", skatteutskottet,
// motion period to 2026-10-05: not decided). Timesheet side: arbetstidslagen 11 § and AFS 2023:2 kap. 9. Review again
// once the Riksdag has decided.
const skv = {
  list: 'https://www.skatteverket.se/foretag/arbetsgivare/personalliggare.4.4f3d00a710cc9ae1c9c80007271.html',
  how: 'https://www.skatteverket.se/foretag/arbetsgivare/personalliggare/safungerarpersonalliggare.4.3810a01c150939e893f224b.html',
  restaurant:
    'https://www.skatteverket.se/foretag/arbetsgivare/personalliggare/personalliggarerestaurang.4.4c6191e3115d2ea500880001977.html',
  beauty:
    'https://www.skatteverket.se/foretag/arbetsgivare/personalliggare/personalliggarekroppsochskonhetsvard.4.2cf1b5cd163796a5c8bb517.html',
  premises:
    'https://www.skatteverket.se/foretag/arbetsgivare/personalliggare/blandadverksamhet.4.22501d9e166a8cb399f2c99.html',
  build:
    'https://www.skatteverket.se/foretag/arbetsgivare/personalliggare/personalliggarebyggbranschen.4.7be5268414bea0646949797.html',
  faq: 'https://www.skatteverket.se/foretag/etjansterochblanketter/svarpavanligafragor/personalliggare.4.3dfca4f410f4fc63c8680005658.html',
};
const sfl =
  'https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/skatteforfarandelag-20111244_sfs-2011-1244/';
const prop = 'https://www.regeringen.se/rattsliga-dokument/proposition/2026/06/prop.-202526282';
const propStatus =
  'https://www.riksdagen.se/sv/dokument-och-lagar/dokument/proposition/effektivare-kontrollmojligheter-i-systemen-for-rot_hd03282/';
const atl =
  'https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/arbetstidslag-1982673_sfs-1982-673/';
const afs =
  'https://www.av.se/globalassets/filer/publikationer/foreskrifter/planering-och-organisering-av-arbetsmiljoarbete-grundlaggande-skyldigheter-for-dig-med-arbetsgivaransvar-afs2023-2.pdf';

export const sv = {
  meta: {
    title: 'Personalliggare eller tidrapport: vad är skillnaden?',
    description:
      'Vilka branscher måste ha personalliggare, vad ska den innehålla och varför behövs tidrapporten ändå för lönen? En enkel genomgång.',
    ogAlt: 'Guide: personalliggare eller tidrapport?',
  },
  card: { eyebrow: 'Guide', title: 'Personalliggare eller tidrapport?' },
  breadcrumb: 'Guide: personalliggare',
  h1: 'Personalliggare eller tidrapport: vad är skillnaden?',
  lede: [
    'En personalliggare är Skatteverkets krav på att företag i vissa branscher löpande antecknar vem som arbetar i verksamheten och när varje arbetspass börjar och slutar, medan en tidrapport är underlaget för hur många timmar varje anställd ska få betalt för. De har olika syften, och i de branscher som omfattas behövs båda.',
    'Guiden går igenom vilka branscher som omfattas 2026, vad liggaren ska innehålla, vad en brist kan kosta och vilka ändringar som är föreslagna. Vi uppdaterar guiden när riksdagen har beslutat om förslagen.',
  ],
  sections: [
    {
      h2: 'Kort svar',
      body: [
        'Personalliggaren visar Skatteverket vem som arbetar i verksamheten och när. Tidrapporten visar hur många timmar varje anställd ska ha betalt för. Ett café, en restaurang eller en frisörsalong behöver i regel båda. En städfirma eller en butik behöver i regel bara tidrapporten.',
      ],
    },
    {
      h2: 'Vad är en personalliggare?',
      body: [
        `En personalliggare är en förteckning över alla som arbetar i verksamheten, dag för dag, med när varje pass börjar och slutar. Den ska finnas tillgänglig i verksamhetslokalen, och Skatteverket får göra kontrollbesök där, kontrollera identiteten hos dem som arbetar och jämföra med liggaren ([Skatteverket, så fungerar personalliggare](${skv.how})).`,
      ],
    },
    {
      h2: 'Vilka branscher måste ha personalliggare?',
      body: [
        `Enligt [Skatteverket](${skv.list}) ska den som bedriver verksamhet i någon av de här sex branscherna föra personalliggare 2026:`,
      ],
      list: [
        `Byggbranschen, där liggaren med vissa undantag ska vara elektronisk ([Skatteverket](${skv.build})).`,
        'Fordonsservice.',
        `Kropps- och skönhetsvård, till exempel hårvård, manikyr och pedikyr, massage och tatuering ([Skatteverket](${skv.beauty})).`,
        'Livsmedels- eller tobaksgrossister, alltså grossistledet och inte butikerna.',
        `Restaurangbranschen, där Skatteverket också räknar in caféer, gatukök, pizzabutiker, personalmatsalar och catering ([Skatteverket](${skv.restaurant})).`,
        'Tvätteribranschen.',
      ],
    },
    {
      h2: 'Undantag och gränsfall',
      body: [
        `Det är vad verksamheten faktiskt gör som avgör, inte vilken branschkod företaget har. Städ och detaljhandel finns inte med i listan, så [städfirmor](page:trade-cleaning) och [butiker](page:trade-shop) behöver i regel ingen personalliggare. Rengör en städfirma textilmattor räknas den delen dock som tvätteri ([Skatteverkets frågor och svar](${skv.faq})). Bedriver ett företag flera verksamheter i samma lokal och minst en av dem omfattas, ska alla som arbetar i lokalen antecknas ([Skatteverket om blandad verksamhet](${skv.premises})). Utom i byggbranschen gäller kravet inte heller i de här fallen:`,
      ],
      list: [
        'Bara ägaren och den närmaste familjen arbetar i verksamheten: i en enskild firma ägaren, make eller maka och barn under 16 år, och motsvarande för företagsledaren i ett fåmansföretag eller fåmanshandelsbolag.',
        'Branschverksamheten är en liten del av företaget: minst 75 procent av verksamheten är något annat, till exempel när restaurangen står för mindre än 25 procent av ett hotells omsättning.',
      ],
    },
    {
      h2: 'Vad personalliggaren ska innehålla',
      body: [`Enligt [Skatteverket](${skv.how}) gäller följande för liggaren:`],
      list: [
        'Företagets namn och personnummer eller organisationsnummer, och för varje dag för- och efternamn samt personnummer, samordningsnummer eller motsvarande utländskt nummer för alla som arbetar.',
        'När varje persons arbetspass börjar och slutar.',
        'Uppgifterna antecknas i direkt samband med att passet börjar och slutar, inte i efterhand.',
        'Utanför byggbranschen får liggaren föras på papper, i en inbunden bok med numrerade sidor och med beständig skrift, eller elektroniskt. En elektronisk liggare ska logga alla händelser, så att det syns vem som ändrade vad och när.',
        'Liggaren sparas i två år efter utgången av det kalenderår då beskattningsåret gick ut.',
      ],
    },
    {
      h2: 'Kontrollbesök och kontrollavgift',
      body: [
        `Vid ett kontrollbesök får Skatteverket kontrollera identiteten hos dem som arbetar och titta i liggaren. Har liggaren inte förts, förts fel eller inte finns tillgänglig kan Skatteverket ta ut en kontrollavgift på 12 500 kronor, plus 2 500 kronor för varje person som arbetar men inte finns antecknad i liggaren ([Skatteverket](${skv.how})). Tas en ny avgift ut inom ett år blir grundbeloppet 25 000 kronor ([skatteförfarandelagen 50 kap. 4 §](${sfl})).`,
      ],
    },
    {
      h2: 'Vad som är på väg att ändras, och vad som inte är det',
      body: [
        'I dag gäller kravet de sex branscherna ovan, och kravet på elektronisk liggare gäller bara byggbranschen. En utredning från 2024 (SOU 2024:61) föreslog elektronisk personalliggare i alla branscher och högre kontrollavgifter.',
        `Regeringen gick inte vidare med de delarna. I [propositionen 2025/26:282](${prop}), som lämnades till riksdagen den 9 juni 2026, bedömer regeringen att det inte bör införas ett krav på elektronisk personalliggare i samtliga branscher och att kontrollavgifterna inte bör justeras i dagsläget. I stället föreslås några ändringar från den 1 januari 2027. Riksdagen har inte beslutat om förslagen än, propositionen bereds i skatteutskottet ([riksdagen.se](${propStatus})). Det här föreslås:`,
      ],
      list: [
        'Vid ett kontrollbesök ska Skatteverket också få utreda om det behövs en skattekontroll, och ställa frågor till företaget och till dem som arbetar där om anställnings- och arbetsförhållanden.',
        'För den som har en annan arbetsgivare än företaget som för liggaren, till exempel inhyrd personal, ska liggaren visa vem som är arbetsgivare.',
        'En elektronisk personalliggare ska vara utformad så att uppgifterna kan överföras elektroniskt till Skatteverket, och de ska överföras när Skatteverket begär det.',
      ],
    },
    {
      h2: 'Vad är en tidrapport, och varför behövs den ändå?',
      body: [
        `En tidrapport visar hur många timmar varje anställd har arbetat, dag för dag, och är underlaget för lönen. Den behövs i alla branscher: för timanställda är timmarna lönen, och [arbetstidslagen 11 §](${atl}) kräver att arbetsgivaren för anteckningar om jourtid, övertid och mertid, som de anställda har rätt att ta del av.`,
        'Personalliggaren räcker inte till det. Den visar när någon var på plats och förs för Skatteverkets kontroll, men den säger inte vilka timmar som ska betalas eller vad som är övertid. Läs mer om [vad en tidrapport ska innehålla](page:guide-timesheet) och om [arbetstidslagen](page:guide-working-hours-act).',
      ],
    },
    {
      h2: 'Personalliggare och tidrapport sida vid sida',
      body: ['Samma frågor, två olika svar:'],
      table: {
        caption:
          'Personalliggare och tidrapport jämförda. Källor: Skatteverket, arbetstidslagen och AFS 2023:2, läst 30 september 2026.',
        head: ['Fråga', 'Personalliggare', 'Tidrapport'],
        rows: [
          [
            'Syfte',
            'Visa Skatteverket vem som arbetar i verksamheten',
            'Underlag för lönen och för anteckningar om övertid och mertid',
          ],
          [
            'Vem kräver den',
            'Skatteverket, i sex branscher',
            'Lönen i praktiken. Arbetstidslagen kräver anteckningar om jourtid, övertid och mertid.',
          ],
          [
            'När den förs',
            'När varje pass börjar och slutar',
            'Per dag, vecka eller månad, ofta i efterhand',
          ],
          ['Innehåll', 'Namn, personnummer, start- och sluttid', 'Datum och timmar per anställd'],
          [
            'Hur länge den sparas',
            'Två år efter utgången av det kalenderår då beskattningsåret gick ut',
            `Anteckningar om övertid och mertid: det kalenderår de gäller och två år till ([AFS 2023:2](${afs})).`,
          ],
          [
            'Vem ser den',
            'Den som för den, och Skatteverket vid kontroll',
            'Arbetsgivaren, och de anställda har rätt att se anteckningarna om sin övertid och mertid',
          ],
        ],
      },
    },
    {
      h2: 'Kan ett system göra båda?',
      body: [
        `Det finns system som för både personalliggare och tidrapport. Kontrollera i så fall att systemet uppfyller Skatteverkets krav för en elektronisk liggare: anteckning när passet börjar och slutar, identitetsuppgifterna och en logg över alla ändringar. Kraven beskrivs på [Skatteverkets webbplats](${skv.how}).`,
      ],
    },
    {
      h2: 'Klokka och personalliggaren',
      body: [
        'Klokka ersätter inte en personalliggare. Klokka är tidrapporten: timmarna per dag, som både arbetsgivaren och den anställda ser. Timmarna förs in i efterhand och Klokka sparar inga personnummer.',
        'Driver du ett [café eller en restaurang](page:trade-cafe) eller en [frisörsalong](page:trade-salon) behöver du därför en personalliggare vid sidan av Klokka.',
      ],
    },
  ],
  faq: [
    {
      q: 'Vilka företag måste ha personalliggare?',
      a: `Enligt Skatteverket företag inom bygg, fordonsservice, kropps- och skönhetsvård, livsmedels- eller tobaksgrossister, restaurang och tvätteri. Undantag finns, till exempel när bara ägaren och den närmaste familjen arbetar i verksamheten. Läs mer hos [Skatteverket](${skv.list}).`,
    },
    {
      q: 'Måste ett café ha personalliggare?',
      a: 'Ja, i regel. Skatteverket räknar caféer som restaurangverksamhet, och restaurangbranschen ska föra personalliggare. Undantag finns, till exempel när bara ägaren och den närmaste familjen arbetar där.',
    },
    {
      q: 'Behöver jag personalliggare om bara jag och min familj jobbar?',
      a: 'Nej, inte om det bara är ägaren, make eller maka och barn under 16 år som arbetar i en enskild firma, eller motsvarande för företagsledaren i ett fåmansföretag eller fåmanshandelsbolag. Undantaget gäller inte i byggbranschen.',
    },
    {
      q: 'Kan tidrapporten användas som personalliggare?',
      a: 'I regel inte. Personalliggaren ska antecknas när passet börjar och slutar och innehålla personnummer, medan en tidrapport ofta förs i efterhand. Ett system kan göra båda om det uppfyller Skatteverkets krav.',
    },
    {
      q: 'Hur länge ska personalliggaren sparas?',
      a: 'I två år efter utgången av det kalenderår då beskattningsåret gick ut, enligt Skatteverket.',
    },
    {
      q: 'Är Klokka en personalliggare?',
      a: 'Nej. Klokka är en tidrapport: arbetsgivaren för in timmarna per dag i efterhand och den anställda ser dem. Klokka antecknar inte när passen börjar och slutar och sparar inga personnummer.',
    },
  ],
  cta: {
    title: 'Tidrapporten kan du sköta i Klokka.',
    body: 'Personalliggaren förs vid sidan av. Timmarna för lönen, som båda ser, sköter Klokka. Gratis att använda. Läs också om [tidrapport för timanställda](page:hourly).',
    button: 'Skapa ditt företag',
  },
  author: 'Klokka',
  reviewed: '2026-09-30',
  sources: [
    { label: 'Personalliggare, vilka branscher, skatteverket.se', url: skv.list },
    { label: 'Så fungerar personalliggare, skatteverket.se', url: skv.how },
    { label: 'Personalliggare i restaurangbranschen, skatteverket.se', url: skv.restaurant },
    { label: 'Personalliggare i kropps- och skönhetsvård, skatteverket.se', url: skv.beauty },
    { label: 'Personalliggare i byggbranschen, skatteverket.se', url: skv.build },
    { label: 'Personalliggare vid blandad verksamhet, skatteverket.se', url: skv.premises },
    { label: 'Svar på vanliga frågor om personalliggare, skatteverket.se', url: skv.faq },
    { label: 'Skatteförfarandelag (2011:1244), 39 kap. 11 § och 50 kap. 3 och 4 §§, riksdagen.se', url: sfl },
    { label: 'Prop. 2025/26:282 Effektivare kontrollmöjligheter, regeringen.se', url: prop },
    { label: 'Prop. 2025/26:282, ärendets status, riksdagen.se', url: propStatus },
    { label: 'Arbetstidslag (1982:673), 11 §, riksdagen.se', url: atl },
    { label: 'AFS 2023:2, kapitel 9, Arbetsmiljöverket', url: afs },
  ],
} as const satisfies GuideCopy;

export const en: PageCopyOf<typeof sv> = {
  meta: {
    title: 'Personalliggare in Sweden: the staff register explained',
    description:
      'Which Swedish businesses need a personalliggare, what it must record, and why you still need monthly hours for pay. A plain guide.',
    ogAlt: 'Guide: personalliggare, the Swedish staff register.',
  },
  card: { eyebrow: 'Guide', title: 'Personalliggare in Sweden, explained' },
  breadcrumb: 'Guide: personalliggare',
  h1: 'Personalliggare in Sweden: the staff register, explained',
  lede: [
    'A personalliggare (staff register) is the Swedish Tax Agency requirement that businesses in certain industries record, as it happens, who is working in the business and when each shift starts and ends, while a timesheet is the basis for how many hours each employee is paid for. They serve different purposes, and the industries covered need both.',
    'This guide covers which industries are covered in 2026, what the register must contain, what a shortcoming can cost and which changes are proposed. We will update the guide once the Riksdag has decided on the proposals.',
  ],
  sections: [
    {
      h2: 'The short answer',
      body: [
        'The personalliggare shows the Tax Agency who works in the business and when. The timesheet shows how many hours each employee is to be paid for. A café, a restaurant or a hair salon usually needs both. A cleaning company or a shop as a rule needs only the timesheet.',
      ],
    },
    {
      h2: 'What is a personalliggare?',
      body: [
        `A personalliggare is a list of everyone working in the business, day by day, with when each shift starts and ends. It must be available on the premises, and the Tax Agency may make inspection visits there, check the identity of those working and compare with the register ([Skatteverket, how the register works](${skv.how}), in Swedish).`,
      ],
    },
    {
      h2: 'Which industries must keep a personalliggare?',
      body: [
        `According to the [Swedish Tax Agency](${skv.list}) (in Swedish), anyone running a business in one of these six industries must keep a personalliggare in 2026:`,
      ],
      list: [
        `Construction, where the register must, with some exceptions, be electronic ([Skatteverket](${skv.build})).`,
        'Vehicle servicing.',
        `Body and beauty care, for example hair care, manicure and pedicure, massage and tattooing ([Skatteverket](${skv.beauty})).`,
        'Food or tobacco wholesale, meaning the wholesale side and not shops.',
        `Restaurants, where the Tax Agency also counts cafés, street kitchens, pizza takeaways, staff canteens and catering ([Skatteverket](${skv.restaurant})).`,
        'Laundries.',
      ],
    },
    {
      h2: 'Exemptions and borderline cases',
      body: [
        `What the business actually does decides, not its industry code. Cleaning and retail are not on the list, so [cleaning companies](page:trade-cleaning) and [shops](page:trade-shop) as a rule need no personalliggare. If a cleaning company cleans textile carpets, however, that part counts as laundry work ([Skatteverket FAQ](${skv.faq})). If a business runs several activities on the same premises and at least one of them is covered, everyone working on the premises must be recorded ([Skatteverket on mixed businesses](${skv.premises})). Except in construction, the requirement also does not apply in these cases:`,
      ],
      list: [
        'Only the owner and close family work in the business: in a sole trader business the owner, their spouse and children under 16, and the equivalent for the manager of a closely held company or partnership.',
        "The covered activity is a small part of the business: at least 75 percent of it is something else, for example when the restaurant makes up less than 25 percent of a hotel's turnover.",
      ],
    },
    {
      h2: 'What the personalliggare must contain',
      body: [`According to the [Tax Agency](${skv.how}), the register works like this:`],
      list: [
        "The business's name and personal identity or organisation number, and for each day the first and last name, plus personal identity number, co-ordination number or the equivalent foreign number, of everyone working.",
        "When each person's shift starts and ends.",
        'The details are recorded as the shift starts and ends, not afterwards.',
        'Outside construction, the register may be kept on paper, in a bound book with numbered pages and permanent ink, or electronically. An electronic register must log every event, so it shows who changed what and when.',
        'The register is kept for two years after the end of the calendar year in which the tax year ended.',
      ],
    },
    {
      h2: 'Inspection visits and the control fee',
      body: [
        `At an inspection visit, the Tax Agency may check the identity of those working and look at the register. If the register has not been kept, has been kept incorrectly or is not available, the Tax Agency can charge a control fee of SEK 12,500, plus SEK 2,500 for each person working who is not recorded in the register ([Skatteverket](${skv.how})). If a new fee is charged within a year, the base amount is SEK 25,000 ([Tax Procedure Act, chapter 50, section 4](${sfl}), in Swedish).`,
      ],
    },
    {
      h2: 'What is set to change, and what is not',
      body: [
        'Today the requirement covers the six industries above, and the requirement for an electronic register applies only to construction. A 2024 inquiry (SOU 2024:61) proposed an electronic personalliggare in every industry and higher control fees.',
        `The government did not go ahead with those parts. In the [government bill 2025/26:282](${prop}) (in Swedish), put to the Riksdag on 9 June 2026, the government takes the view that a requirement for an electronic register in every industry should not be introduced and that the control fees should not be adjusted at present. Instead it proposes some changes from 1 January 2027. The Riksdag has not yet decided on them, the bill is with the Committee on Taxation ([riksdagen.se](${propStatus}), in Swedish). The proposals:`,
      ],
      list: [
        'At an inspection visit, the Tax Agency would also be able to look into whether a tax audit is needed, and question the business and the people working there about employment and working conditions.',
        'For someone whose employer is not the business keeping the register, such as hired staff, the register would have to show who the employer is.',
        'An electronic register would have to be built so that its details can be transferred electronically to the Tax Agency, and they would have to be transferred when the Tax Agency asks.',
      ],
    },
    {
      h2: 'What is a timesheet, and why do you still need one?',
      body: [
        `A timesheet shows how many hours each employee worked, day by day, and is the basis for pay. It is needed in every industry: for hourly staff the hours are the pay, and [section 11 of the Working Hours Act](${atl}) (in Swedish) requires the employer to keep records of on-call time, overtime and additional hours, which employees have the right to see.`,
        'The personalliggare does not cover that. It shows when someone was on site and is kept for the Tax Agency to check, but it does not say which hours are to be paid or what counts as overtime. Read more about [how to track employee hours](page:guide-timesheet) and the [Swedish Working Hours Act](page:guide-working-hours-act).',
      ],
    },
    {
      h2: 'Personalliggare and timesheet side by side',
      body: ['The same questions, two different answers:'],
      table: {
        caption:
          'The personalliggare and the timesheet compared. Sources: the Tax Agency, the Working Hours Act and AFS 2023:2, read 30 September 2026.',
        head: ['Question', 'Personalliggare', 'Timesheet'],
        rows: [
          [
            'Purpose',
            'Show the Tax Agency who works in the business',
            'The basis for pay and for records of overtime and additional hours',
          ],
          [
            'Who requires it',
            'The Tax Agency, in six industries',
            'Pay, in practice. The Working Hours Act requires records of on-call time, overtime and additional hours.',
          ],
          ['When it is kept', 'As each shift starts and ends', 'Per day, week or month, often afterwards'],
          ['Contents', 'Name, identity number, start and end time', 'Date and hours per employee'],
          [
            'How long it is kept',
            'Two years after the end of the calendar year in which the tax year ended',
            `Records of overtime and additional hours: the calendar year they cover and two more ([AFS 2023:2](${afs})).`,
          ],
          [
            'Who sees it',
            'Whoever keeps it, and the Tax Agency at an inspection',
            'The employer, and employees may see the records of their overtime and additional hours',
          ],
        ],
      },
    },
    {
      h2: 'Can one system do both?',
      body: [
        `Some systems keep both a personalliggare and a timesheet. If you use one, check that it meets the Tax Agency requirements for an electronic register: recording as the shift starts and ends, the identity details and a log of every change. The requirements are described on [the Tax Agency website](${skv.how}) (in Swedish).`,
      ],
    },
    {
      h2: 'Klokka and the personalliggare',
      body: [
        'Klokka does not replace a personalliggare. Klokka is the timesheet: the hours per day, seen by both the employer and the employee. The hours are logged afterwards and Klokka stores no identity numbers.',
        'If you run a [café or restaurant](page:trade-cafe) or a [hair salon](page:trade-salon), you therefore need a personalliggare alongside Klokka.',
      ],
    },
  ],
  faq: [
    {
      q: 'Which businesses in Sweden must keep a personalliggare?',
      a: `According to the Swedish Tax Agency, businesses in construction, vehicle servicing, body and beauty care, food or tobacco wholesale, restaurants and laundries. There are exemptions, for example when only the owner and close family work in the business. Read more at [Skatteverket](${skv.list}) (in Swedish).`,
    },
    {
      q: 'Does a café need a personalliggare?',
      a: 'As a rule, yes. The Tax Agency counts cafés as restaurant businesses, and the restaurant trade must keep a personalliggare. There are exemptions, for example when only the owner and close family work there.',
    },
    {
      q: 'Do I need a personalliggare if only my family and I work there?',
      a: 'No, not if only the owner, their spouse and children under 16 work in a sole trader business, or the equivalent for the manager of a closely held company or partnership. The exemption does not apply in construction.',
    },
    {
      q: 'Can a timesheet be used as a personalliggare?',
      a: 'As a rule, no. The personalliggare is recorded as the shift starts and ends and holds identity numbers, while a timesheet is often kept afterwards. One system can do both if it meets the Tax Agency requirements.',
    },
    {
      q: 'How long must the personalliggare be kept?',
      a: 'For two years after the end of the calendar year in which the tax year ended, according to the Tax Agency.',
    },
    {
      q: 'Is Klokka a personalliggare?',
      a: 'No. Klokka is a timesheet: the employer logs the hours per day afterwards and the employee sees them. Klokka does not record when shifts start and end, and stores no identity numbers.',
    },
  ],
  cta: {
    title: 'Klokka handles the timesheet half.',
    body: 'The personalliggare is kept alongside. The hours for pay, seen by both sides, are what Klokka does. Free to use. Read also about [hours tracking for hourly employees](page:hourly).',
    button: 'Create your business',
  },
  author: 'Klokka',
  reviewed: '2026-09-30',
  sources: [
    { label: 'Personalliggare, which industries, skatteverket.se (Swedish)', url: skv.list },
    { label: 'How the personalliggare works, skatteverket.se (Swedish)', url: skv.how },
    { label: 'Personalliggare in the restaurant trade, skatteverket.se (Swedish)', url: skv.restaurant },
    { label: 'Personalliggare in body and beauty care, skatteverket.se (Swedish)', url: skv.beauty },
    { label: 'Personalliggare in construction, skatteverket.se (Swedish)', url: skv.build },
    { label: 'Personalliggare in a mixed business, skatteverket.se (Swedish)', url: skv.premises },
    { label: 'Frequently asked questions on the personalliggare, skatteverket.se (Swedish)', url: skv.faq },
    { label: 'Tax Procedure Act (2011:1244), riksdagen.se (Swedish)', url: sfl },
    { label: 'Government bill 2025/26:282, regeringen.se (Swedish)', url: prop },
    { label: 'Government bill 2025/26:282, status, riksdagen.se (Swedish)', url: propStatus },
    { label: 'Working Hours Act (1982:673), section 11, riksdagen.se (Swedish)', url: atl },
    { label: 'AFS 2023:2, chapter 9, Swedish Work Environment Authority (Swedish)', url: afs },
  ],
};
