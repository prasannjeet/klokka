/**
 * Every string on klokka's public site, in Swedish and English.
 *
 * `sv` is the source of truth, written for Swedish small employers (not translated from the English), and
 * declared `as const` so its shape is exact. `en` is typed against it through `Dictionary`: a missing key,
 * an extra key or a list of a different length is a type error, not a blank spot on the page.
 *
 * Business model rule (AGENTS.md): the site says free to use and open source and offers a direct sign-up.
 * It never mentions pricing, tiers or seats. No em dash anywhere (lint and test/dictionaries.test.ts).
 *
 * Numbers that are part of a sentence live here per language ("22,5 h" / "22.5 h"); the sample data drawn
 * as UI (week grids, pay rows, bars) lives in `lib/sample.ts` and is formatted with @klokka/core/format.
 */

export const sv = {
  meta: {
    title: 'Gratis tidrapportering för småföretag | Klokka',
    description:
      'Gratis tidrapportering för småföretag: du för in de anställdas timmar per dag och båda ser samma månad. Öppen källkod, webb och Android.',
    ogAlt: 'Klokka. En klocka. För båda.',
    card: { eyebrow: 'Öppen källkod, MIT', title: 'Gratis tidrapportering för småföretag' },
    breadcrumb: 'Klokka',
    /** The pill on the homepage's link card. */
    cardPill: 'Gratis och öppen källkod · klokka.se',
    jsonLdDescription:
      'Klokka är en gratis app med öppen källkod där arbetsgivaren för in timmarna varje anställd har jobbat och båda ser samma månad. Lön är valfritt.',
  },
  a11y: {
    skip: 'Hoppa till innehållet',
    mainNav: 'Huvudmeny',
    home: 'Klokka, till startsidan',
    openMenu: 'Öppna menyn',
    closeMenu: 'Stäng menyn',
    menu: 'Meny',
    language: 'Språk',
    switchLanguage: 'In English',
    theme: 'Byt mellan ljust och mörkt läge',
    external: 'öppnas på en annan webbplats',
    breadcrumbs: 'Du är här',
  },
  nav: {
    how: 'Så funkar det',
    employers: 'Arbetsgivare',
    employees: 'Anställda',
    insights: 'Insikter',
    openSource: 'Öppen källkod',
    faq: 'Frågor',
    login: 'Logga in',
    createWorkspace: 'Skapa ett företag',
  },
  hero: {
    badge: 'Gratis och öppen källkod. MIT-licens.',
    line1: 'En klocka.',
    line2: 'För båda.',
    madeFor: 'Gratis tidrapportering för',
    words: ['kaféet', 'pizzerian', 'frisörsalongen', 'städfirman', 'bageriet', 'kvartersbutiken'],
    lead: 'Arbetsgivaren för in timmarna som var och en har jobbat. De anställda ser samma månad i mobilen, dag för dag, direkt när något ändras. Lönen är ett val, inte ett krav.',
    primaryCta: 'Skapa ditt företag',
    secondaryCta: 'Se hur det funkar',
    note: 'Gratis att använda, inget kort behövs. Öppen källkod under MIT-licens, ingen gräns för antalet anställda. Fungerar på webben och i Android-appen, på svenska och engelska.',
    trust: [
      'Android och webb, samma funktioner',
      'Svenska och engelska',
      'CSV-export av vilken månad som helst',
      'Kör på egen server om du vill',
    ],
    clockLabel: 'En stationsklocka som visar vad klockan är just nu',
  },
  stage: {
    label: 'Exempel: arbetsgivaren fyller i en vecka, den anställda får en notis och ser samma summa',
    title: 'Vecka 39',
    subtitle: '21–27 september, exempelföretag',
    pill: 'Nora loggar',
    gridLabel: 'Veckorutnät, timmar per person och dag',
    days: ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'],
    off: 'ledig',
    weekTotal: 'Veckans summa',
    phoneLabel: 'Marias telefon',
    phoneDelta: '+2 h mot förra veckan',
    toastApp: 'Klokka',
    toastWhen: 'nu',
    toastBody: 'Nora lade till 5 dagar för dig, 22,5 h i vecka 39. Tryck för att se veckan.',
  },
  ticker: {
    label: 'Exempel på vad Klokka berättar',
    items: [
      'Nora lade till 5 dagar för Maria, 22,5 h',
      'Jonas flaggade tisdag: jobbade 6 h, inte 4',
      'September stängd: 486 h för 4 personer',
      'Ayla accepterade inbjudan',
      'Samma som i går: 4 h på torsdag',
      'Vecka 39 exporterad som CSV',
      'Flaggan åtgärdad: tisdag är nu 6 h',
      'Veckosammanfattning skickad till 2 som bett om den',
    ],
  },
  how: {
    eyebrow: 'Så funkar det',
    title: 'Tidrapportering i tre steg. Sen sköter det sig självt.',
    lead: 'Klokka gör en enda sak: timmarna någon har jobbat, så att båda är överens. Allt annat i appen finns för att det ska gå på några sekunder.',
    steps: [
      {
        title: 'Bjud in',
        body: 'Skriv namn och e-post. Personen får ett mejl, väljer ett lösenord och hamnar i ditt företag som anställd. Tills dess står det Inbjuden.',
      },
      {
        title: 'För in timmar',
        body: 'Välj person, välj dag, tryck på en knapp. Eller fyll i allas vecka i rutnätet, som i ett kalkylark. Varje ändring sparas, med vem och när.',
      },
      {
        title: 'Båda ser samma',
        body: 'Den anställda får en notis för hela omgången, inte fem. Ni tittar på samma månad och samma summor, så länge företaget finns.',
      },
    ],
    invite: {
      label: 'E-post',
      title: 'Nora bjöd in dig till Klokka',
      sub: 'Café Nord, som anställd',
      action: 'Acceptera inbjudan',
      expires: 'Gäller i 7 dagar',
    },
    log: {
      name: 'Maria',
      day: 'Tisdag 22 september',
      save: 'Spara',
      same: 'Samma som i går',
    },
    notify: {
      title: 'Nora lade till 5 dagar, 22,5 h',
      body: 'Vecka 39. Tryck för att se veckan.',
      month: 'Din september',
      total: '142 h',
    },
  },
  employers: {
    eyebrow: 'För arbetsgivare',
    title: 'En hel vecka på en minut. Sen tillbaka till jobbet.',
    lead: 'Inget att ställa in, inget att lära sig. Öppna veckan, skriv timmarna, klart. Klokka meddelar dem det gäller.',
    features: [
      {
        title: 'Veckorutnätet',
        body: 'Alla anställda, veckans alla dagar, på en skärm. Tabba dig fram som i ett kalkylark.',
      },
      {
        title: 'Snabbknappar',
        body: '0,5, 1, 2, 4, 8 och hel dag. Plus Samma som i går för dagarna som ser likadana ut.',
      },
      {
        title: 'En anteckning när det behövs',
        body: 'Öppnade tidigt, täckte för Jonas, inventeringskväll. En rad, sparad med posten.',
      },
      {
        title: 'Stäng månaden',
        body: 'Lås den, exportera CSV-filen och lämna den till den som sköter lönen. Lås upp om något dyker upp.',
      },
      {
        title: 'Flaggor kommer till dig',
        body: 'Håller en anställd inte med får du en push. Rätta eller avfärda, båda får veta.',
      },
      {
        title: 'Historik på varje post',
        body: 'Vem som ändrade vad, och när. Synligt för er båda.',
      },
    ],
    grid: {
      label: 'Exempel: arbetsgivarens veckorutnät',
      title: 'Café Nord',
      subtitle: 'Vecka 39, 21–27 september',
      tabs: ['Vecka', 'Månad'],
      gridLabel: 'Veckorutnät, fyra anställda',
      close: 'Stäng september',
      export: 'Exportera CSV',
      flag: '1 öppen flagga',
    },
  },
  employees: {
    eyebrow: 'För anställda',
    title: 'Dina timmar i mobilen, direkt när de ändras.',
    lead: 'Inget tjat, ingen bild på en papperslapp i personalrummet. Månaden finns där med sin summa, och du får veta varje gång den ändras.',
    features: [
      {
        title: 'Se månaden',
        body: 'Varje dag du har jobbat, summan, snittet per arbetsdag och hur det står sig mot förra månaden.',
      },
      {
        title: 'En notis, inte fem',
        body: 'Har timmar lagts till eller ändrats? En notis per tillfälle, i appen och som push.',
      },
      {
        title: 'Flagga det som ser fel ut',
        body: 'Jobbade du 6 h, inte 4? Säg det direkt på posten. Arbetsgivaren får flaggan, du får svaret.',
      },
      {
        title: 'Dela din månad',
        body: 'Ett kort där det står Din september: 142 h, gjort för att sparas eller skickas.',
      },
      {
        title: 'Två arbetsgivare, en app',
        body: 'Jobbar du på två ställen? Byt mellan företagen. Var och en har sina egna timmar och sin egen färg.',
      },
      {
        title: 'Mörkt läge, så klart',
        body: 'Följer din telefon. Eller välj själv.',
      },
    ],
    phone: {
      label: 'Exempel: den anställdas månadsvy i mobilen',
      month: 'Café Nord, september 2026',
      total: '142',
      delta: '+9 h mot augusti',
      dow: ['M', 'T', 'O', 'T', 'F', 'L', 'S'],
      notifTitle: 'Nora lade till 5 dagar, 22,5 h',
      notifBody: 'Vecka 39, nyss',
      flagTitle: 'Din flagga på tisdag 22 är åtgärdad',
      flagBody: 'Nu 6 h. I går',
    },
  },
  apk: {
    cta: 'Hämta Android-appen',
    note: 'En signerad APK som du installerar direkt härifrån. Android frågar en gång om webbläsaren får installera appar.',
  },
  pay: {
    eyebrow: 'Lön på eller av',
    title: 'Bara timmar. Eller timmar och lön.',
    lead: 'Ett reglage i inställningarna för företaget. Av: Klokka är en ren redovisning av timmar och pengarna sköter du någon annanstans. På: varje anställd har en timlön och varje timsiffra får ett belopp bredvid sig. Den anställda ser det också. Det är hela poängen.',
    switchLabel: 'Visa lön för anställda',
    offTitle: 'Av',
    offBody: 'Bara timmar. Ingen ser någon timlön.',
    onTitle: 'På',
    onBody: 'Timlön per person. Pengar bredvid varje timme.',
    cardTitle: 'Vecka 39',
    cardSubtitle: 'Café Nord, exempelföretag',
    people: '3 personer',
    total: 'Veckans summa',
    rateNote: 'Påhittade timlöner på 170 och 190 kr. Valutan följer företaget.',
  },
  insights: {
    eyebrow: 'Insikter',
    title: 'Månaden, förklarad på en skärm.',
    lead: 'Ingen instrumentpanel att ställa in. De sex frågor en arbetsgivare ställer varje månad, besvarade. De anställda får sina egna tre: timmar, snitt per arbetsdag och bästa veckan.',
    hours: 'Timmar den här månaden',
    hoursDelta: '+31 h mot augusti',
    busiest: 'Dag med flest timmar',
    busiestValue: 'Fredag',
    busiestSub: '26 h i snitt',
    projected: 'Beräknat månadsslut',
    projectedSub: '581 h i augusti',
    perEmployee: 'Per anställd',
    weekday: 'Fördelning per veckodag',
    weekdayLabel: 'Timmar per veckodag, fredag har flest',
    weekdayLetters: ['M', 'T', 'O', 'T', 'F', 'L', 'S'],
    empty: 'Dagar utan timmar',
    emptySub: 'Två lördagar. Tryck för att fylla i.',
    cost: 'Lönekostnad den här månaden',
    costSub: 'Visas eftersom Visa lön är på',
    illustrative: 'Exempelföretag med fyra personer, september 2026. Påhittade siffror.',
  },
  openSource: {
    eyebrow: 'Gratis och öppen källkod',
    title: 'Öppen källkod. Varenda rad.',
    lead: 'Klokka är MIT-licensierad. Använd den, ändra den, kör den för ditt eget företag eller åt andra. Versionen vi driftar bygger på samma kod.',
    mitLabel: 'MIT-licens',
    mitBody:
      'Tillåtande, kort och äldre än de flesta företag som kommer att använda Klokka. Forka den redan första dagen om du vill.',
    cloneLabel: 'Kommando för att klona koden',
    cards: [
      {
        title: 'Gratis att använda, inget kort',
        body: 'Registrera dig och för in timmar i dag. Samma Klokka för ett kafé med tre anställda och en städfirma med trettio.',
      },
      {
        title: 'Din data följer med dig',
        body: 'CSV-export av vilken månad och vilken anställd som helst, när som helst. Vill du köra själv finns allt i samma repo, med Docker.',
      },
      {
        title: 'Byggd öppet',
        body: 'Färdplanen är ärendelistan på GitHub. Svenska och engelska från start, fler språk via pull request.',
      },
    ],
  },
  faq: {
    eyebrow: 'Frågor',
    title: 'Innan du frågar.',
    items: [
      {
        q: 'Kan anställda föra in sina egna timmar?',
        a: 'Inte i första versionen. Arbetsgivaren för in, den anställda ser och kan flagga en post som ser fel ut. Instämpling och egen rapportering står på listan, när den gemensamma redovisningen sitter.',
      },
      {
        q: 'Är det verkligen gratis?',
        a: 'Ja. Klokka är gratis att använda och du behöver inget kort för att registrera dig. Koden är MIT-licensierad, så du kan också köra en egen kopia.',
      },
      {
        q: 'Vilken gratis app för tidrapportering passar ett litet företag?',
        a: 'Det beror på vem som för in tiden. Klokka passar för tidrapportering där arbetsgivaren för in timmarna åt en handfull anställda och båda ser samma månad. Ska personalen stämpla in själv, eller behöver ni schema, passar en stämpelklocka eller ett schemaverktyg bättre.',
      },
      {
        q: 'Måste jag visa lön?',
        a: 'Nej. Lön är ett reglage för företaget och det är av från början. Slå på det så får varje anställd en timlön och ser pengar bredvid timmarna. Slå av det så är det bara timmar.',
      },
      {
        q: 'Vilka språk finns?',
        a: 'Svenska och engelska från start, på webben och i appen. Texterna delas mellan webben och mobilen, så de säger alltid samma sak.',
      },
      {
        q: 'Vilka telefoner funkar?',
        a: 'Android, med appen installerad direkt från den här sidan. På iPhone använder du webbappen i webbläsaren, den har samma funktioner.',
      },
      {
        q: 'Var finns min data?',
        a: 'På vår driftade instans i EU, i en databas som lagrar timmar, inte lösenord. Inloggningen sköts av Logto. Du kan exportera vilken månad som helst, när du vill.',
      },
      {
        q: 'Vad händer när en månad stängs?',
        a: 'Månaden låses: inga ändringar förrän arbetsgivaren låser upp den. De anställda får veta det, och CSV-filen är klar för den som sköter lönen.',
      },
      {
        q: 'Vad är en flagga?',
        a: 'Den anställdas sätt att säga att en post är fel, med ett meddelande. Arbetsgivaren rättar eller avfärdar den, båda får en notis och historiken visar vad som hände.',
      },
      {
        q: 'Är Klokka en personalliggare?',
        a: 'Nej. I Klokka förs timmarna in i efterhand, och det är ingen personalliggare. Kaféer, restauranger och frisörsalonger som måste föra personalliggare behöver den fortfarande, vid sidan av Klokka.',
      },
    ],
  },
  cta: {
    startEyebrow: 'Kom igång',
    startTitle: 'Skapa ett företag. Bjud in en person. För in timmar i dag.',
    startLead:
      'Fem minuter från registreringen till den första timmen i Klokka. Inbjudningsmejlet sköter resten.',
    create: 'Skapa ditt företag',
    login: 'Logga in',
    invitedEyebrow: 'Redan inbjuden?',
    invitedTitle: 'Har du fått en inbjudan?',
    invitedLead:
      'Tryck på länken i mejlet och välj ett lösenord, så väntar dina timmar på dig. Hämta sedan appen till mobilen.',
  },
  footer: {
    blurb:
      'Timmarna, synliga för båda. Gratis och öppen källkod, byggd i Sverige för alla ställen som betalar per timme.',
    openSource: 'Öppen källkod',
    groups: {
      product: 'Produkt',
      tools: 'Verktyg och mallar',
      guides: 'Guider',
      industries: 'Branscher',
      klokka: 'Om Klokka',
    },
    links: {
      how: 'Så funkar det',
      employers: 'För arbetsgivare',
      employees: 'För anställda',
      insights: 'Insikter',
      pay: 'Lön på eller av',
      android: 'Android-appen',
      github: 'GitHub',
      license: 'MIT-licens',
      issues: 'Ärenden och färdplan',
      faq: 'Frågor',
      login: 'Logga in',
      create: 'Skapa ett företag',
    },
    copyright: '© 2026 Klokka. MIT-licens.',
  },
  notFound: {
    title: 'Sidan finns inte.',
    back: 'Till startsidan',
  },
} as const;

/** The shape of `sv` with every literal widened to string: what every other language must match exactly. */
type Widen<T> = T extends string ? string : { readonly [K in keyof T]: Widen<T[K]> };
export type Dictionary = Widen<typeof sv>;

export const en: Dictionary = {
  meta: {
    title: 'Free timesheet app for employee hours | Klokka',
    description:
      'A free timesheet app for employee hours: you log what each person worked, day by day, and both sides see the same month. Open source, on web and Android.',
    ogAlt: 'Klokka. One clock. Both sides.',
    card: { eyebrow: 'Open source, MIT', title: 'Free timesheet app for small teams' },
    breadcrumb: 'Klokka',
    cardPill: 'Free and open source · klokka.se',
    jsonLdDescription:
      'Klokka is a free, open-source app where an employer logs the hours each employee worked and both of them see the same month. Pay is optional.',
  },
  a11y: {
    skip: 'Skip to content',
    mainNav: 'Main',
    home: 'Klokka, home',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    menu: 'Menu',
    language: 'Language',
    switchLanguage: 'På svenska',
    theme: 'Switch between light and dark mode',
    external: 'opens on another site',
    breadcrumbs: 'Breadcrumb',
  },
  nav: {
    how: 'How it works',
    employers: 'Employers',
    employees: 'Employees',
    insights: 'Insights',
    openSource: 'Open source',
    faq: 'FAQ',
    login: 'Log in',
    createWorkspace: 'Create a business',
  },
  hero: {
    badge: 'Free and open source. MIT licence.',
    line1: 'One clock.',
    line2: 'Both sides.',
    madeFor: 'Free time tracking for the',
    words: ['cafe', 'salon', 'bakery', 'cleaning crew', 'corner shop', 'small agency'],
    lead: 'The employer logs the hours each person worked. Every employee sees the same month on their phone, day by day, the moment it changes. Pay is a switch, not a requirement.',
    primaryCta: 'Create your business',
    secondaryCta: 'See how it works',
    note: 'Free to use, no card needed. Open source under the MIT licence, no limit on the number of employees. Works on the web and in the Android app, in English and Swedish.',
    trust: [
      'Android and web, same features',
      'English and Swedish',
      'CSV export of any month',
      'Self-host if you like',
    ],
    clockLabel: 'A railway clock showing the current time',
  },
  stage: {
    label: 'Example: an employer fills a week, the employee is notified and sees the same total',
    title: 'Week 39',
    subtitle: '21 to 27 September, example business',
    pill: 'Nora is logging',
    gridLabel: 'Week grid, hours per person per day',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    off: 'off',
    weekTotal: 'Week total',
    phoneLabel: "Maria's phone",
    phoneDelta: '+2 h vs last week',
    toastApp: 'Klokka',
    toastWhen: 'now',
    toastBody: 'Nora added 5 days for you, 22.5 h in week 39. Tap to see the week.',
  },
  ticker: {
    label: 'Examples of what Klokka tells people',
    items: [
      'Nora added 5 days for Maria, 22.5 h',
      'Jonas flagged Tuesday: worked 6 h, not 4',
      'September closed: 486 h across 4 people',
      'Ayla accepted the invitation',
      'Same as yesterday: 4 h on Thursday',
      'Week 39 exported as CSV',
      'Flag resolved: Tuesday is now 6 h',
      'Weekly digest sent to 2 people who asked for it',
    ],
  },
  how: {
    eyebrow: 'How it works',
    title: 'Timesheets in three steps. Then they run themselves.',
    lead: 'Klokka does one job: the hours a person worked, agreed by both sides. Everything else in the app exists to make that job take seconds.',
    steps: [
      {
        title: 'Invite',
        body: 'Add a name and an email. They get one email, set a password and land in your business as an employee. Until then they show as Invited.',
      },
      {
        title: 'Log hours',
        body: "Pick a person, pick a day, tap a chip. Or fill everyone's week in the grid like a spreadsheet. Every change is kept, with who and when.",
      },
      {
        title: 'Everyone sees',
        body: 'The employee gets one notification for the sitting, not five. Both of you look at the same month and the same totals, for as long as the business exists.',
      },
    ],
    invite: {
      label: 'Email',
      title: 'Nora invited you to Klokka',
      sub: 'Café Nord, as employee',
      action: 'Accept invitation',
      expires: 'Expires in 7 days',
    },
    log: {
      name: 'Maria',
      day: 'Tuesday 22 September',
      save: 'Save',
      same: 'Same as yesterday',
    },
    notify: {
      title: 'Nora added 5 days, 22.5 h',
      body: 'Week 39. Tap to see the week.',
      month: 'Your September',
      total: '142 h',
    },
  },
  employers: {
    eyebrow: 'For employers',
    title: 'Log a week in a minute. Then get on with the day.',
    lead: 'Nothing to configure, nothing to learn. Open the week, type the hours, done. Klokka tells the people it concerns.',
    features: [
      {
        title: 'The week grid',
        body: 'Every employee, every day of the week, one screen. Tab across it like a spreadsheet.',
      },
      {
        title: 'Quick chips',
        body: '0.5, 1, 2, 4, 8 and a full day. Plus Same as yesterday for the days that repeat.',
      },
      {
        title: 'A note when it matters',
        body: 'Opened early, covered for Jonas, inventory night. One line, kept with the entry.',
      },
      {
        title: 'Close the month',
        body: 'Lock it, export the CSV, hand it to whoever runs the pay. Unlock if something comes up.',
      },
      {
        title: 'Flags come to you',
        body: 'An employee disagrees, you get a push. Fix it or dismiss it; both sides are told.',
      },
      {
        title: 'History on every entry',
        body: 'Who changed what, and when. Visible to both of you.',
      },
    ],
    grid: {
      label: "Example: the employer's week grid",
      title: 'Café Nord',
      subtitle: 'Week 39, 21 to 27 September',
      tabs: ['Week', 'Month'],
      gridLabel: 'Week grid, four employees',
      close: 'Close September',
      export: 'Export CSV',
      flag: '1 open flag',
    },
  },
  employees: {
    eyebrow: 'For employees',
    title: 'Your hours, on your phone, the moment they change.',
    lead: 'No asking, no photo of a paper sheet in the break room. The month is there with its total, and you are told every time it moves.',
    features: [
      {
        title: 'See the month',
        body: 'Every day you worked, the total, the average per working day, and how it compares to last month.',
      },
      {
        title: 'Get told, once',
        body: 'Hours added or changed? One notification per sitting, in the app and as a push.',
      },
      {
        title: 'Flag what looks wrong',
        body: 'Worked 6 h, not 4? Say so on the entry. The employer gets it, you get the answer.',
      },
      {
        title: 'Share your month',
        body: 'A card that says Your September: 142 h, made to save or send.',
      },
      {
        title: 'Two employers, one app',
        body: 'Work at two places? Switch between businesses; each keeps its own hours and its own colour.',
      },
      {
        title: 'Dark mode, obviously',
        body: 'Follows your phone. Or pick one.',
      },
    ],
    phone: {
      label: "Example: the employee's month view on a phone",
      month: 'September 2026, Café Nord',
      total: '142',
      delta: '+9 h vs August',
      dow: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
      notifTitle: 'Nora added 5 days, 22.5 h',
      notifBody: 'Week 39, just now',
      flagTitle: 'Your flag on Tuesday 22 was fixed',
      flagBody: 'Now 6 h. Yesterday',
    },
  },
  apk: {
    cta: 'Get the Android app',
    note: 'A signed APK you install straight from this site (sideloading). Android asks once to allow installs from your browser.',
  },
  pay: {
    eyebrow: 'The pay switch',
    title: 'Hours only. Or hours and pay.',
    lead: 'One switch in the business settings. Off, Klokka is a clean record of hours and you do money elsewhere. On, every employee has an hourly rate and every hours figure gets a money figure beside it. The employee sees it too. That is the point.',
    switchLabel: 'Show pay to employees',
    offTitle: 'Off',
    offBody: 'Hours only. Nobody sees a rate.',
    onTitle: 'On',
    onBody: 'Rates per person. Money next to every hour.',
    cardTitle: 'Week 39',
    cardSubtitle: 'Café Nord, example business',
    people: '3 people',
    total: 'Week total',
    rateNote: 'Illustrative rates of SEK 170 and SEK 190 per hour. The currency follows the business.',
  },
  insights: {
    eyebrow: 'Insights',
    title: 'The month, explained on one screen.',
    lead: 'Not a dashboard to configure. The six questions an employer asks every month, answered. Employees get their own three: hours, average per working day, best week.',
    hours: 'Hours this month',
    hoursDelta: '+31 h vs August',
    busiest: 'Busiest day',
    busiestValue: 'Friday',
    busiestSub: '26 h on average',
    projected: 'Projected month end',
    projectedSub: '581 h in August',
    perEmployee: 'Per employee',
    weekday: 'Weekday distribution',
    weekdayLabel: 'Hours per weekday, Friday is the highest',
    weekdayLetters: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
    empty: 'Days with nothing logged',
    emptySub: 'Two Saturdays. Tap to fill.',
    cost: 'Labour cost this month',
    costSub: 'Shows because the pay switch is on',
    illustrative: 'Example business with four people, September 2026. Illustrative numbers.',
  },
  openSource: {
    eyebrow: 'Free and open source',
    title: 'Open source. Every line of it.',
    lead: 'Klokka is MIT licensed. Use it, change it, run it for your own business or for others. The hosted version we run is built from the same code.',
    mitLabel: 'MIT licence',
    mitBody:
      'Permissive, short, and older than most of the businesses that will use this. Fork it on day one if you like.',
    cloneLabel: 'Clone command',
    cards: [
      {
        title: 'Free to use, no card needed',
        body: 'Sign up and log today. The same Klokka for a cafe of three and a cleaning firm of thirty.',
      },
      {
        title: 'Your data leaves with you',
        body: 'CSV export of any month, any employee, any time. To run it yourself, everything is in the same repository, with Docker.',
      },
      {
        title: 'Built in the open',
        body: 'The roadmap is the issue tracker. English and Swedish from day one, more languages by pull request.',
      },
    ],
  },
  faq: {
    eyebrow: 'Questions',
    title: 'Before you ask.',
    items: [
      {
        q: 'Can employees log their own hours?',
        a: 'Not in the first version. The employer logs, the employee sees, and can flag an entry that looks wrong. A clock-in timer and self-logging are on the list, after the shared record is right.',
      },
      {
        q: 'Is it really free?',
        a: 'Yes. Klokka is free to use and you need no card to sign up. The code is MIT licensed, so you can also run your own copy.',
      },
      {
        q: 'Which free timesheet app suits a small business?',
        a: 'It depends on who records the time. Klokka fits time tracking where the employer logs the hours for a handful of staff and both sides see the same month. If staff should clock in themselves, or you need schedules, a time clock or a scheduling tool fits better.',
      },
      {
        q: 'Do I have to show pay?',
        a: 'No. Pay is a switch per business, off by default. Turn it on and every employee gets an hourly rate and sees money next to hours. Turn it off and it is hours only.',
      },
      {
        q: 'Which languages?',
        a: 'English and Swedish from day one, on the web and in the app. The strings are shared between web and mobile, so the two never drift apart.',
      },
      {
        q: 'Which phones?',
        a: 'Android, with the app installed straight from this site. On an iPhone, use the web app in the browser; it has the same features.',
      },
      {
        q: 'Where does my data live?',
        a: 'On our hosted instance in the EU, in a database that stores hours, not passwords. Sign-in is handled by Logto. Export any month, any time.',
      },
      {
        q: 'What happens when a month is closed?',
        a: 'The month locks: no edits until the employer unlocks it. Employees are told, and the CSV is ready for whoever runs the pay.',
      },
      {
        q: 'What is a flag?',
        a: "An employee's way to say an entry is wrong, with a message. The employer fixes or dismisses it; both sides are notified and the history shows what happened.",
      },
      {
        q: 'Is Klokka a staff register (personalliggare)?',
        a: 'No. Klokka records hours after the fact; it is not a staff register. Cafes, restaurants and salons in Sweden that must keep a personalliggare still need one, alongside Klokka.',
      },
    ],
  },
  cta: {
    startEyebrow: 'Get started',
    startTitle: 'Create a business. Invite one person. Log today.',
    startLead: 'Five minutes from sign-up to the first logged hour. The invitation email does the rest.',
    create: 'Create your business',
    login: 'Log in',
    invitedEyebrow: 'Already invited?',
    invitedTitle: 'Got an invitation email?',
    invitedLead:
      'Tap the link in it, set a password, and your hours are waiting. Then get the app for your phone.',
  },
  footer: {
    blurb: 'Hours in the open. Free, open source, built in Sweden for every place that pays by the hour.',
    openSource: 'Open source',
    groups: {
      product: 'Product',
      tools: 'Tools and templates',
      guides: 'Guides',
      industries: 'Industries',
      klokka: 'About Klokka',
    },
    links: {
      how: 'How it works',
      employers: 'For employers',
      employees: 'For employees',
      insights: 'Insights',
      pay: 'The pay switch',
      android: 'Android app',
      github: 'GitHub',
      license: 'MIT licence',
      issues: 'Issues and roadmap',
      faq: 'FAQ',
      login: 'Log in',
      create: 'Create a business',
    },
    copyright: '© 2026 Klokka. MIT licensed.',
  },
  notFound: {
    title: 'Page not found.',
    back: 'Go to the start page',
  },
};
