// Composites the exact Klokka mark + live type over the Higgsfield backgrounds in backgrounds/, one JPEG per format
// into cards/. Run from the repo root: node docs/brand/social/compose.mjs (needs npm install for playwright + @fontsource).
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
const require = createRequire('/home/dev/documents/projects/klokka/package.json');
const { chromium } = require('playwright');

const dir = new URL('.', import.meta.url).pathname;
const mark = readFileSync(dir + '../final/klokka-mark.svg', 'utf8').replace(/<\?xml[^>]*>/, '').replace(/<title>.*?<\/title>/, '').replace(/fill="#FD286B"/, 'fill="#FF006E"');
const b64 = (f) => readFileSync(f.startsWith('/') ? f : dir + 'backgrounds/' + f).toString('base64');
const fontFile = (f) => require.resolve('@fontsource/' + f);
const font = (name, file, w) => `@font-face{font-family:'${name}';src:url(data:font/woff2;base64,${b64(file)}) format('woff2');font-weight:${w}}`;
const css = font('Unbounded', fontFile('unbounded/files/unbounded-latin-800-normal.woff2'), 800) + font('Inter', fontFile('inter/files/inter-latin-500-normal.woff2'), 500) + font('Inter', fontFile('inter/files/inter-latin-600-normal.woff2'), 600);

const copy = {
  sv: { l1: 'En klocka.', l2: 'För båda.', sub: 'Gratis tidrapportering för småföretag', pill: 'Gratis och öppen källkod' },
  en: { l1: 'One clock.', l2: 'Both sides.', sub: 'Free hours tracking for small employers', pill: 'Free and open source' },
};

const bgUrl = (f) => `data:image/jpeg;base64,${b64(f)}`;
const logo = (h) => `<div style="display:flex;align-items:center;gap:${h * 0.28}px"><div style="width:${h}px;height:${h}px">${mark.replace(/width="\d+" height="\d+"/, `width="${h}" height="${h}"`)}</div><div style="font:800 ${h * 0.78}px/1 Unbounded;letter-spacing:-.02em;color:#F4EFFF">klokka</div></div>`;

// Landscape card: key visual on the right, scrim + type on the left.
function landscape({ w, h, bg, pos = 'right center', size = 'cover', t, scale = 1, pill = true, sub = true }) {
  const s = (h / 630) * scale;
  return `<div style="position:relative;width:${w}px;height:${h}px;overflow:hidden;background:#0D0620">
    <div style="position:absolute;inset:0;background:url(${bgUrl(bg)}) ${pos}/${size} no-repeat"></div>
    <div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(13,6,32,.94) 0%,rgba(13,6,32,.8) 40%,rgba(13,6,32,0) 66%)"></div>
    <div style="position:absolute;left:${72 * s}px;top:${60 * s}px;bottom:${60 * s}px;display:flex;flex-direction:column;justify-content:space-between">
      ${logo(58 * s)}
      <div style="display:flex;flex-direction:column;gap:${22 * s}px">
        <div style="font:800 ${(bg.startsWith('phones-right') ? 74 : 88) * s}px/1.04 Unbounded;letter-spacing:-.025em;color:#F4EFFF">${t.l1}<br><span style="color:#FF006E;text-shadow:0 0 ${28 * s}px rgba(255,0,110,.55)">${t.l2}</span></div>
        ${sub ? `<div style="font:500 ${(bg.startsWith('phones-right') ? 25 : 30) * s}px/1.3 Inter;color:#B4A4E4">${t.sub}</div>` : ''}
      </div>
      ${pill ? `<div style="align-self:flex-start;font:600 ${22 * s}px/1 Inter;color:#F4EFFF;padding:${11 * s}px ${22 * s}px;border:${2 * s}px solid #3A2A6A;border-radius:999px;background:rgba(26,16,51,.7)">${t.pill} · klokka.se</div>` : `<div></div>`}
    </div></div>`;
}

// Square card: key visual up top, type centred at the bottom.
function square({ w, bg, t }) {
  const s = w / 1200;
  return `<div style="position:relative;width:${w}px;height:${w}px;overflow:hidden;background:#0D0620">
    <div style="position:absolute;inset:0;background:url(${bgUrl(bg)}) center/cover no-repeat;transform:scale(.84) translateY(7%);-webkit-mask-image:radial-gradient(closest-side,#000 78%,transparent)"></div>
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(13,6,32,.55) 0%,rgba(13,6,32,0) 22%,rgba(13,6,32,0) 55%,rgba(13,6,32,.9) 78%)"></div>
    <div style="position:absolute;top:${70 * s}px;left:0;right:0;display:flex;justify-content:center">${logo(64 * s)}</div>
    <div style="position:absolute;bottom:${110 * s}px;left:0;right:0;text-align:center;font:800 ${112 * s}px/1.04 Unbounded;letter-spacing:-.025em;color:#F4EFFF">${t.l1}<br><span style="color:#FF006E;text-shadow:0 0 ${30 * s}px rgba(255,0,110,.55)">${t.l2}</span></div>
  </div>`;
}


// Centred card: everything that matters sits in the middle 560 px, so a centre-square crop (WhatsApp, Telegram) keeps it.
function centred({ w, h, bg, t }) {
  const s = h / 630;
  return `<div style="position:relative;width:${w}px;height:${h}px;overflow:hidden;background:#0D0620">
    <div style="position:absolute;inset:0;background:url(${bgUrl(bg)}) center/cover no-repeat"></div>
    <div style="position:absolute;inset:0;background:radial-gradient(38% 60% at 50% 50%,rgba(13,6,32,.55),rgba(13,6,32,0))"></div>
    <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${26 * s}px;text-align:center">
      ${logo(54 * s)}
      <div style="font:800 ${76 * s}px/1.04 Unbounded;letter-spacing:-.025em;color:#F4EFFF">${t.l1}<br><span style="color:#FF006E;text-shadow:0 0 ${26 * s}px rgba(255,0,110,.55)">${t.l2}</span></div>
      <div style="font:500 ${25 * s}px/1.3 Inter;color:#B4A4E4">${t.sub}</div>
    </div></div>`;
}

// A per-page card: the template every future SEO page would get, only the eyebrow + title change.
function pageCard({ bg, eyebrow, title, path }) {
  return `<div style="position:relative;width:1200px;height:630px;overflow:hidden;background:#0D0620">
    <div style="position:absolute;inset:0;background:url(${bgUrl(bg)}) right center/cover no-repeat;opacity:.9"></div>
    <div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(13,6,32,.95) 0%,rgba(13,6,32,.8) 50%,rgba(13,6,32,.1) 80%)"></div>
    <div style="position:absolute;left:72px;top:60px;bottom:60px;right:360px;display:flex;flex-direction:column;justify-content:space-between">
      ${logo(50)}
      <div style="display:flex;flex-direction:column;gap:20px">
        <div style="font:600 22px/1 Inter;letter-spacing:.14em;text-transform:uppercase;color:#FF006E">${eyebrow}</div>
        <div style="font:800 64px/1.08 Unbounded;letter-spacing:-.02em;color:#F4EFFF">${title}</div>
      </div>
      <div style="font:500 24px/1 Inter;color:#B4A4E4">${path}</div>
    </div></div>`;
}

const jobs = [];
for (const lang of ['sv', 'en']) {
  const t = copy[lang];
  const phones = lang === 'sv' && existsSync(dir + 'backgrounds/phones-right-sv.jpg') ? 'phones-right-sv.jpg' : 'phones-right-en.jpg';
  jobs.push([`og-phones-${lang}`, 1200, 630, landscape({ w: 1200, h: 630, bg: phones, size: 'auto 100%', t })]);
  if (existsSync(dir + 'backgrounds/phones-sides-en.jpg')) jobs.push([`og-centre-${lang}`, 1200, 630, centred({ w: 1200, h: 630, bg: lang === 'sv' && existsSync(dir + 'backgrounds/phones-sides-sv.jpg') ? 'phones-sides-sv.jpg' : 'phones-sides-en.jpg', t })]);
  jobs.push([`og-clock-${lang}`, 1200, 630, landscape({ w: 1200, h: 630, bg: 'clock.jpg', t })]);
  jobs.push([`og-grid-${lang}`, 1200, 630, landscape({ w: 1200, h: 630, bg: 'week-grid.jpg', t })]);
  jobs.push([`og-cafe-${lang}`, 1200, 630, landscape({ w: 1200, h: 630, bg: 'cafe.jpg', t })]);
  jobs.push([`square-${lang}`, 1200, 1200, square({ w: 1200, bg: 'square-clock-grid.jpg', t })]);
  jobs.push([`x-${lang}`, 1200, 600, centred({ w: 1200, h: 600, bg: lang === 'sv' ? 'phones-sides-sv.jpg' : 'phones-sides-en.jpg', t })]);
  jobs.push([`github-${lang}`, 1280, 640, centred({ w: 1280, h: 640, bg: lang === 'sv' ? 'phones-sides-sv.jpg' : 'phones-sides-en.jpg', t })]);
  jobs.push([`play-feature-${lang}`, 1024, 500, landscape({ w: 1024, h: 500, bg: phones, size: 'auto 100%', t, pill: false })]);
  jobs.push([`producthunt-${lang}`, 1270, 760, centred({ w: 1270, h: 760, bg: lang === 'sv' ? 'phones-sides-sv.jpg' : 'phones-sides-en.jpg', t })]);
  jobs.push([`x-header-${lang}`, 1500, 500, landscape({ w: 1500, h: 500, bg: 'week-grid.jpg', t, sub: false, pill: false, scale: 1.05 })]);
}
jobs.push(['page-mall-sv', 1200, 630, pageCard({ bg: 'week-grid.jpg', eyebrow: 'Gratis mall', title: 'Tidrapport mall för anställda, klar att fylla i', path: 'klokka.se/tidrapport-mall' })]);
jobs.push(['page-smaforetag-sv', 1200, 630, pageCard({ bg: 'cafe.jpg', eyebrow: 'För småföretag', title: 'Tidrapportering för kaféet, salongen och städfirman', path: 'klokka.se/tidrapportering-smaforetag' })]);
jobs.push(['page-opensource-en', 1200, 630, pageCard({ bg: 'clock.jpg', eyebrow: 'Open source', title: 'Self-host your team’s hours tracking', path: 'klokka.se/en/open-source' })]);

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const [name, w, h, body] of jobs) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<!doctype html><html><head><style>${css}*{margin:0;box-sizing:border-box}body{width:${w}px;height:${h}px}</style></head><body>${body}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${dir}cards/${name}.jpg`, type: 'jpeg', quality: 86, clip: { x: 0, y: 0, width: w, height: h } });
}
await browser.close();
console.log('done', jobs.length);
