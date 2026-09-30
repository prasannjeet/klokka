import type { PageCopyBase, PageCopyOf } from './types';

export const sv = {
  meta: {
    title: 'Tidrapportering app för Android och webben | Klokka',
    description:
      'Klokkas app visar månadens timmar direkt i mobilen. Pushnotis när timmar ändras, flagga fel rad, mörkt läge. Gratis och öppen källkod.',
    ogAlt: 'Tidrapportering i mobilen: Klokka för Android och webben.',
  },
  card: { eyebrow: 'Android och webb', title: 'Tidrapport i mobilen' },
  breadcrumb: 'Appen',
  h1: 'Tidrapportering i en app, för både arbetsgivaren och de anställda',
  lede: [
    'Klokka är en app för tidrapportering där arbetsgivaren loggar timmarna och den anställda ser dem i mobilen direkt, med en pushnotis varje gång något ändras. Appen är gratis att använda, har öppen källkod under MIT-licens och ingen gräns för antalet anställda, och finns för Android och på webben, på svenska och engelska.',
    'Det är samma app för båda sidor. Arbetsgivaren ser veckorutnätet och månaden för hela företaget, den anställda ser sina egna dagar, sin summa och varje ändring som görs.',
  ],
  sections: [
    {
      h2: 'Det här gör appen för arbetsgivaren',
      body: [
        'Du för in timmarna per person och dag. Oftast går det fortast i veckorutnätet, där alla anställda och veckans alla dagar syns på en skärm och du tabbar dig fram som i ett kalkylark.',
      ],
      list: [
        'Snabbknappar för 0,5, 1, 2, 4 och 8 timmar eller en hel dag, och Samma som i går för dagarna som ser likadana ut.',
        'En anteckning på posten när det behövs: öppnade tidigt, täckte upp för en kollega, inventering.',
        'Avrundning till kvart eller halvtimme om ni vill, och en standardlängd för en arbetsdag.',
        'Lås månaden när den stämmer och exportera den som en CSV-fil till den som sköter lönen.',
        'Lön är ett val: slå på det för företaget så får varje anställd en timlön och ser beloppet bredvid timmarna.',
      ],
    },
    {
      h2: 'Det här ser den anställda',
      body: [
        'Den anställda öppnar appen och ser sin månad: varje dag med timmar, månadens summa, snittet per arbetsdag och hur månaden står sig mot förra. Veckan och den enskilda dagen finns ett tryck bort.',
        'Månaden kan delas som ett kort, till exempel "Din september: 142 h", för att sparas eller skickas vidare. Jobbar någon på två ställen byter hen mellan företagen i samma app, och vart och ett har sina egna timmar.',
      ],
    },
    {
      h2: 'En notis per tillfälle, inte fem',
      body: [
        'När arbetsgivaren lägger till, ändrar eller tar bort timmar får den anställda en notis i appen och som push i Android-appen. Ändringar som görs vid samma tillfälle slås ihop till en notis: "Nora lade till 5 dagar för dig, 22,5 h i vecka 39" i stället för fem separata.',
        'Den som vill kan dessutom få en sammanfattning av veckan på mejl varje måndag. Den är avstängd tills man själv slår på den.',
      ],
    },
    {
      h2: 'Flagga en rad som är fel',
      body: [
        'Ser en post fel ut flaggar den anställda den direkt, med ett meddelande: "Jobbade 6 h, inte 4". Arbetsgivaren får en notis, rättar posten eller avfärdar flaggan, och båda får veta hur det gick.',
        'Varje ändring sparas i en historik med vem som ändrade vad och när, synlig för båda. Läs mer om [får arbetsgivaren ändra tidrapporten?](page:guide-change) och om hur ändringar blir rättvisa för båda sidor.',
      ],
    },
    {
      h2: 'Android, webben och iPhone',
      body: [
        'Android-appen är en signerad APK som hämtas direkt från klokka.se. Android frågar en gång om webbläsaren får installera appar, sedan är den installerad som vilken app som helst.',
        'Webbappen fungerar i alla webbläsare, på datorn och i mobilen, med samma funktioner som Android-appen. Har du en iPhone använder du webbappen i Safari: det finns ingen app för iPhone ännu.',
      ],
    },
    {
      h2: 'Installera appen',
      body: ['Det tar ett par minuter, och du behöver bara göra det en gång.'],
      list: [
        'Hämta APK-filen från klokka.se med telefonens webbläsare.',
        'Tillåt installationen när Android frågar, och öppna filen.',
        'Logga in, eller öppna länken i inbjudningsmejlet om din arbetsgivare har bjudit in dig.',
      ],
    },
    {
      h2: 'Vad appen inte gör',
      body: [
        'Klokka är ingen stämpelklocka och har ingen GPS, inget schema och ingen lönekörning. De anställda för inte in sina egna timmar i den här versionen: arbetsgivaren för in, den anställda ser och kan flagga. Behöver ni något av det andra passar ett annat verktyg bättre, eller Klokka vid sidan av det.',
        'Driver du ett litet företag med några få anställda? Läs mer om [tidrapportering för småföretag](page:small-business), eller om hur du [för tidrapport](page:guide-timesheet) på ett sätt som håller.',
      ],
    },
  ],
  faq: [
    {
      q: 'Vilken app kan jag använda för att registrera min arbetstid?',
      a: 'Är det din arbetsgivare som för in timmarna kan ni använda Klokka: arbetsgivaren loggar och du ser samma siffror i mobilen. Vill du själv logga din egen tid gör Klokka inte det i den här versionen, då passar en app för egen tidrapportering bättre.',
    },
    {
      q: 'Vilken gratis app för tidrapportering är bäst?',
      a: 'Det beror på vem som för in tiden. Klokka passar när arbetsgivaren för in timmarna åt en handfull anställda och båda ska se samma månad. Ska personalen stämpla in själv, eller behöver ni schema, passar en stämpelklocka eller ett schemaverktyg bättre.',
    },
    {
      q: 'Finns appen för iPhone?',
      a: 'Inte som app. På iPhone använder du webbappen i Safari, den har samma funktioner som Android-appen.',
    },
    {
      q: 'Varför hämtar jag appen från klokka.se?',
      a: 'Android-appen är signerad av oss och hämtas direkt från klokka.se, utan en appbutik emellan. Android frågar en gång om webbläsaren får installera appar.',
    },
    {
      q: 'Kan de anställda stämpla in?',
      a: 'Nej. Klokka är ingen stämpelklocka. Arbetsgivaren för in timmarna i efterhand och den anställda ser dem direkt.',
    },
  ],
  cta: {
    title: 'Skapa ditt företag och hämta appen.',
    body: 'Gratis att använda, inget kort behövs. Bjud in de anställda så ser ni samma månad, i appen eller på webben.',
    button: 'Skapa ditt företag',
  },
} as const satisfies PageCopyBase;

export const en: PageCopyOf<typeof sv> = {
  meta: {
    title: 'Timesheet app for Android and the web | Klokka',
    description:
      'A free timesheet app for Android and the web: the employer logs the hours, staff see them on their phone with a push when anything changes.',
    ogAlt: 'The employee timesheet app: Klokka for Android and the web.',
  },
  card: { eyebrow: 'Android and web', title: 'The employee timesheet app' },
  breadcrumb: 'The app',
  h1: 'The timesheet app for Android that both sides can see',
  lede: [
    'Klokka is a timesheet app where the employer logs the hours and the employee sees them on their phone straight away, with a push notification every time something changes. It is free to use, open source under the MIT licence with no limit on employees, and runs on Android and the web, in English and Swedish.',
    'It is one app for both sides. The employer sees the week grid and the month for the whole business; the employee sees their own days, their total and every change that is made.',
  ],
  sections: [
    {
      h2: 'What the app does for the employer',
      body: [
        'You log the hours per person and day. Usually the fastest way is the week grid, which shows every employee and every day of the week on one screen, and you tab through it like a spreadsheet.',
      ],
      list: [
        'Quick buttons for 0.5, 1, 2, 4 and 8 hours or a full day, and Same as yesterday for the days that look alike.',
        'A note on the entry when it helps: opened early, covered for a colleague, stocktaking.',
        'Rounding to the quarter or half hour if you want it, and a default length for a working day.',
        'Lock the month once it is right and export it as a CSV file for whoever runs payroll.',
        'Pay is optional: switch it on for the business and each employee gets an hourly rate and sees the amount next to the hours.',
      ],
    },
    {
      h2: 'What the employee sees',
      body: [
        'The employee opens the app and sees their month: every day with hours, the month total, the average per working day and how the month compares with the last one. The week and the single day are one tap away.',
        'The month can be shared as a card, such as "Your September: 142 h", to keep or send on. Someone who works in two places switches between the businesses in the same app, each with its own hours.',
      ],
    },
    {
      h2: 'One notification per sitting, not five',
      body: [
        'When the employer adds, changes or removes hours, the employee gets a notification in the app and as a push in the Android app. Changes made in one sitting are merged into one notification: "Nora added 5 days for you, 22.5 h in week 39" instead of five separate ones.',
        'Anyone who wants it can also get a weekly summary by email every Monday. It stays off until they switch it on.',
      ],
    },
    {
      h2: 'Flag an entry that is wrong',
      body: [
        'If an entry looks wrong, the employee flags it right there with a message: "Worked 6 h, not 4". The employer gets a notification, fixes the entry or dismisses the flag, and both are told the outcome.',
        'Every change is kept in a history of who changed what and when, visible to both. Read more on [whether an employer can change your hours](page:guide-change) and how to keep changes fair for both sides.',
      ],
    },
    {
      h2: 'Android, the web and iPhone',
      body: [
        'The Android app is a signed APK that you download directly from klokka.se. Android asks once whether the browser may install apps; after that it is installed like any other app.',
        'The web app works in any browser, on a computer or a phone, with the same features as the Android app. On an iPhone you use the web app in Safari: there is no iPhone app yet.',
      ],
    },
    {
      h2: 'Install the app',
      body: ['It takes a couple of minutes, and you only do it once.'],
      list: [
        "Download the APK file from klokka.se in your phone's browser.",
        'Allow the install when Android asks, and open the file.',
        'Log in, or open the link in the invitation email if your employer has invited you.',
      ],
    },
    {
      h2: 'What the app does not do',
      body: [
        'Klokka is not a time clock and has no GPS, no scheduling and no payroll run. Employees do not log their own hours in this version: the employer logs, the employee sees and can flag. If you need any of that, another tool fits better, or Klokka next to it.',
        'Running a small business with a handful of staff? Read about [time tracking for small businesses](page:small-business), or [how to track employee hours](page:guide-timesheet) in a way that holds up.',
      ],
    },
  ],
  faq: [
    {
      q: 'Which app can I use to record my working hours?',
      a: 'If your employer logs the hours, you can use Klokka: the employer logs and you see the same numbers on your phone. If you want to log your own time, Klokka does not do that in this version, and an app for personal time tracking fits better.',
    },
    {
      q: 'What is the best free timesheet app?',
      a: 'It depends on who records the time. Klokka fits when the employer logs the hours for a handful of staff and both sides should see the same month. If staff should clock in themselves, or you need scheduling, a time clock or a scheduling tool fits better.',
    },
    {
      q: 'Is there an iPhone app?',
      a: 'Not as an app. On an iPhone you use the web app in Safari, which has the same features as the Android app.',
    },
    {
      q: 'Why do I download the app from klokka.se?',
      a: 'The Android app is signed by us and downloaded directly from klokka.se, with no app store in between. Android asks once whether the browser may install apps.',
    },
    {
      q: 'Can employees clock in?',
      a: 'No. Klokka is not a time clock. The employer logs the hours afterwards and the employee sees them straight away.',
    },
  ],
  cta: {
    title: 'Create your business and get the app.',
    body: 'Free to use, no card needed. Invite your staff and you see the same month, in the app or on the web.',
    button: 'Create your business',
  },
};
