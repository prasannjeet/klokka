import { issuesUrl, licenseUrl, repoUrl } from '@/lib/links';
import type { PageCopyBase, PageCopyOf } from './types';

const contributingUrl = `${repoUrl}/blob/main/CONTRIBUTING.md` as const;
const securityUrl = `${repoUrl}/blob/main/SECURITY.md` as const;

export const sv = {
  meta: {
    title: 'Tidrapportering med öppen källkod (MIT) | Klokka',
    description:
      'Klokka är tidrapportering med öppen källkod under MIT-licens. Använd tjänsten gratis eller kör den själv: koden och Dockerfiles finns på GitHub.',
    ogAlt: 'Tidrapportering med öppen källkod. Varenda rad.',
  },
  card: { eyebrow: 'MIT-licens', title: 'Öppen källkod. Varenda rad.' },
  breadcrumb: 'Öppen källkod',
  h1: 'Tidrapportering med öppen källkod, under MIT-licens',
  lede: [
    'Klokka är tidrapportering med öppen källkod under MIT-licens: arbetsgivaren loggar de anställdas timmar och båda ser samma månad. Tjänsten vi driftar är gratis att använda, utan gräns för antalet anställda, på webben och i Android-appen, på svenska och engelska.',
    'Öppen källkod betyder att du kan läsa varenda rad som hanterar dina anställdas timmar, och att Klokka inte försvinner med ett företag. Koden finns på GitHub, och den version som körs på klokka.se byggs från samma kod.',
  ],
  sections: [
    {
      h2: 'Vad MIT-licensen betyder',
      body: [
        `[MIT-licensen](${licenseUrl}) är en av de mest tillåtande licenserna som finns. Du får använda Klokka, ändra koden och köra den, även i ditt företag eller åt andra. Det enda villkoret är att upphovsrättsmeddelandet och licenstexten följer med när du sprider koden vidare.`,
      ],
    },
    {
      h2: 'Samma kod som tjänsten',
      body: [
        'Det finns ingen stängd kärna. Allt som tjänsten på klokka.se kör finns i samma repo: API:t, webbappen, Android-appen och den här webbplatsen. Det som inte finns där är våra lösenord och nycklar, som det ska vara.',
      ],
    },
    {
      h2: 'Vad som finns i repot',
      body: ['Hela Klokka ligger i ett repo, uppdelat i några delar:'],
      list: [
        'API:t, skrivet i Java 25 med Quarkus, med PostgreSQL som databas.',
        'Webbappen i Next.js och Android-appen i Expo (React Native).',
        'Ett gemensamt API-kontrakt i OpenAPI, som både servern och klienterna genereras från.',
        'Inloggning via Logto, och en Dockerfile för API:t, webbappen och webbplatsen.',
      ],
    },
    {
      h2: 'Kör Klokka själv',
      body: [
        'Vill du köra Klokka på din egen server behöver du API:t, webbappen, en PostgreSQL-databas, en egen Logto för inloggningen och ett SMTP-konto för inbjudningsmejlen. Pushnotiser till Android-appen kräver dessutom ett eget Expo-projekt och Firebase.',
        'Koden och Dockerfiles finns på GitHub. Någon steg-för-steg-guide för att köra Klokka själv finns inte ännu: README beskriver hur man kör Klokka lokalt för utveckling. För de flesta är den driftade tjänsten enklast, och den är gratis att använda.',
      ],
    },
    {
      h2: 'Andra verktyg med öppen källkod',
      body: [
        'Kimai, solidtime och Traggo är bra verktyg med öppen källkod, men de är byggda för att var och en ska mäta sin egen tid, ofta per projekt eller kund, med timer. Klokka är byggt för en arbetsgivare som för in timmarna åt sina anställda, som sedan ser dem.',
        'Licenserna skiljer sig också: Kimai och solidtime har AGPL-3.0, Traggo GPL-3.0 och Klokka MIT.',
      ],
    },
    {
      h2: 'Bidra',
      body: [
        `Ärendelistan på GitHub är färdplanen. Hittar du ett fel eller saknar något, skriv ett [ärende på GitHub](${issuesUrl}). Pull requests är välkomna, både kod och översättningar: läs [CONTRIBUTING.md](${contributingUrl}) först. Säkerhetsproblem rapporteras enligt [SECURITY.md](${securityUrl}), inte i ett öppet ärende.`,
      ],
    },
    {
      h2: 'Din data',
      body: [
        'Vilken månad som helst kan exporteras som en CSV-fil, när du vill, så dina timmar sitter aldrig fast i Klokka. Kör du Klokka själv ligger timmarna i din egen databas. Hur den driftade tjänsten hanterar uppgifterna står i [integritetspolicyn](page:privacy), och vem som bygger Klokka på sidan [om Klokka](page:about).',
      ],
    },
  ],
  faq: [
    {
      q: 'Får jag använda Klokka i mitt företag eller sälja det vidare?',
      a: 'Ja. MIT-licensen tillåter användning, ändringar och kommersiell användning, så länge upphovsrättsmeddelandet och licenstexten följer med koden.',
    },
    {
      q: 'Behöver jag en egen server?',
      a: 'Nej. Tjänsten på klokka.se är gratis att använda. Att köra Klokka själv är ett val, inte ett krav.',
    },
    {
      q: 'Vad behövs för att köra Klokka själv?',
      a: 'API:t, webbappen, PostgreSQL, en Logto-instans för inloggningen och ett SMTP-konto för inbjudningar. Pushnotiser kräver ett Expo-projekt och Firebase. Någon installationsguide finns inte ännu.',
    },
    {
      q: 'Finns det Docker-images?',
      a: 'Repot innehåller en Dockerfile för API:t, webbappen och webbplatsen, så du kan bygga egna images. Färdiga images att hämta publiceras inte i dag.',
    },
    {
      q: 'Hur skiljer sig Klokka från Kimai?',
      a: 'I vem som för in tiden. I Kimai mäter var och en sin egen tid, ofta per projekt. I Klokka för arbetsgivaren in timmarna åt de anställda, som ser samma månad i mobilen.',
    },
  ],
  cta: {
    title: 'Använd Klokka gratis, eller läs koden först.',
    body: `Skapa ett företag på några minuter, eller [se koden på GitHub](${repoUrl}).`,
    button: 'Skapa ditt företag',
  },
} as const satisfies PageCopyBase;

export const en: PageCopyOf<typeof sv> = {
  meta: {
    title: 'Open source time tracking (MIT licence) | Klokka',
    description:
      'Klokka is open source time tracking under MIT. Use the hosted service for free or self-host it: the code and the Dockerfiles are on GitHub.',
    ogAlt: 'Open source time tracking, every line of it.',
  },
  card: { eyebrow: 'MIT licence', title: 'Open source time tracking' },
  breadcrumb: 'Open source',
  h1: 'Open source time tracking for employers of hourly staff',
  lede: [
    'Klokka is open source time tracking under the MIT licence, built for employers who log the hours their hourly staff worked, with each employee seeing the same month. The hosted service is free to use with no limit on employees, and it runs on the web and Android, in English and Swedish.',
    "Open source means you can read every line that handles your staff's hours, and Klokka does not disappear with a company. The code is on GitHub, and the version running on klokka.se is built from the same code.",
  ],
  sections: [
    {
      h2: 'What MIT means here',
      body: [
        `The [MIT licence](${licenseUrl}) is one of the most permissive licences there is. You may use Klokka, change the code and run it, in your own business or for others, commercially too. The one condition is that the copyright notice and the licence text travel with the code when you pass it on.`,
      ],
    },
    {
      h2: 'The same code as the hosted service',
      body: [
        'There is no closed core. Everything the service on klokka.se runs is in the same repository: the API, the web app, the Android app and this website. What is not in there is our passwords and keys, as it should be.',
      ],
    },
    {
      h2: 'What is in the repository',
      body: ['All of Klokka lives in one repository, split into a few parts:'],
      list: [
        'The API, written in Java 25 with Quarkus, on a PostgreSQL database.',
        'The web app in Next.js and the Android app in Expo (React Native).',
        'One API contract in OpenAPI, from which both the server and the clients are generated.',
        'Sign-in through Logto, and a Dockerfile for the API, the web app and the website.',
      ],
    },
    {
      h2: 'Run it yourself',
      body: [
        'To self-host Klokka you need the API, the web app, a PostgreSQL database, your own Logto instance for sign-in and an SMTP account for the invitation emails. Push notifications to the Android app also need your own Expo project and Firebase.',
        'The code and the Dockerfiles are on GitHub. There is no step-by-step self-hosting guide yet: the README covers running Klokka locally for development. For most people the hosted service is the simplest option, and it is free to use.',
      ],
    },
    {
      h2: 'How Klokka differs from other open source time trackers',
      body: [
        'Kimai, solidtime and Traggo are good open source tools, but they are built for people tracking their own time, often per project or client, with a timer. Klokka is built for an employer who records the hours for their staff, who then see them.',
        'The licences differ too: Kimai and solidtime are AGPL-3.0, Traggo is GPL-3.0 and Klokka is MIT.',
      ],
    },
    {
      h2: 'Contribute',
      body: [
        `The issue list on GitHub is the roadmap. If you find a bug or miss something, open an [issue on GitHub](${issuesUrl}). Pull requests are welcome, code and translations alike: read [CONTRIBUTING.md](${contributingUrl}) first. Security problems are reported as described in [SECURITY.md](${securityUrl}), not in a public issue.`,
      ],
    },
    {
      h2: 'Your data',
      body: [
        'Any month can be exported as a CSV file whenever you like, so your hours are never stuck in Klokka. If you self-host, the hours sit in your own database. How the hosted service handles data is in the [privacy policy](page:privacy), and who builds Klokka is on the [about page](page:about).',
      ],
    },
  ],
  faq: [
    {
      q: 'Can I use Klokka commercially?',
      a: 'Yes. The MIT licence allows use, changes and commercial use, as long as the copyright notice and the licence text stay with the code.',
    },
    {
      q: 'Do I need my own server?',
      a: 'No. The service on klokka.se is free to use. Self-hosting is a choice, not a requirement.',
    },
    {
      q: 'What do I need to self-host Klokka?',
      a: 'The API, the web app, PostgreSQL, a Logto instance for sign-in and an SMTP account for invitations. Push notifications need an Expo project and Firebase. There is no install guide yet.',
    },
    {
      q: 'Is there a Docker image?',
      a: 'The repository has a Dockerfile for the API, the web app and the website, so you can build your own images. Ready-made images to pull are not published today.',
    },
    {
      q: 'How is Klokka different from Kimai or solidtime?',
      a: 'In who records the time. In Kimai and solidtime people track their own time, often per project. In Klokka the employer logs the hours for the staff, who see the same month on their phones.',
    },
  ],
  cta: {
    title: 'Use Klokka for free, or read the code first.',
    body: `Create a business in a few minutes, or [view the code on GitHub](${repoUrl}).`,
    button: 'Create your business',
  },
};
