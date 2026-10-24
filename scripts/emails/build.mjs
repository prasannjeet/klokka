// Generates every Klokka email from one layout (layout.mjs) and the sv/en catalogue (CHQ-148):
//   infra/logto/email-templates.json                        the 7 Logto templates x 2 languages (push-logto.mjs)
//   apps/api/service/src/main/resources/templates/digest.html  the API's weekly digest (Qute)
// Both are committed. `--check` regenerates in memory and fails when a committed file differs.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { business, button, cell, code, digest, esc, p, page, row, rows, small, strong } from './layout.mjs';

const root = (path) => fileURLToPath(new URL(`../../${path}`, import.meta.url));
const LOGTO_OUT = root('infra/logto/email-templates.json');
const DIGEST_OUT = root('apps/api/service/src/main/resources/templates/digest.html');
export const SITE = '%%SITE%%'; // push-logto.mjs puts the environment's landing URL here
export const SITE_HOST = '%%SITE_HOST%%'; // and its host name here
const LANGS = ['sv', 'en'];

function flatten(tree, prefix = '', acc = {}) {
  for (const [k, v] of Object.entries(tree)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') acc[key] = v;
    else flatten(v, key, acc);
  }
  return acc;
}
const catalogue = Object.fromEntries(
  LANGS.map((l) => [l, flatten(JSON.parse(readFileSync(root(`packages/core/i18n/${l}.json`), 'utf8')))]),
);

// Catalogue text with its `{placeholders}` replaced; values are trusted template syntax, the text is escaped.
function t(lang, key, values = {}) {
  const text = catalogue[lang][key];
  if (text === undefined) throw new Error(`missing catalogue key ${lang}:${key}`);
  return esc(text).replace(/\{([a-zA-Z]+)\}/g, (_match, name) => {
    if (!(name in values)) throw new Error(`${lang}:${key} has {${name}} without a value`);
    return values[name];
  });
}

// Logto fills {{...}}: `code` and `link` itself, the rest from the API's invitation messagePayload (LogtoService).
const LOGTO_VARS = {
  code: '{{code}}',
  inviter: '{{inviterName}}',
  workspace: '{{workspaceName}}',
  name: '{{inviteeName}}',
  date: '{{expiresOn}}',
};
const CODE_TEMPLATES = {
  Register: 'register',
  ForgotPassword: 'forgotPassword',
  SignIn: 'signIn',
  BindNewIdentifier: 'bindNewIdentifier',
  UserPermissionValidation: 'userPermissionValidation',
  Generic: 'generic',
};

function codeEmail(lang, prefix) {
  const note = catalogue[lang][`email.${prefix}.note`]
    ? t(lang, `email.${prefix}.note`)
    : t(lang, 'email.common.codeExpires');
  const subject = t(lang, `email.${prefix}.subject`, LOGTO_VARS);
  return {
    subject,
    content: page({
      lang,
      title: subject,
      preheader: t(lang, 'email.common.codeExpires'),
      title1: t(lang, `email.${prefix}.title1`),
      title2: t(lang, `email.${prefix}.title2`),
      content:
        p(t(lang, `email.${prefix}.body`)) +
        code(LOGTO_VARS.code, t(lang, 'email.common.codeLabel')) +
        small(note),
      footer: [t(lang, 'email.common.footer')],
      site: SITE,
      siteHost: SITE_HOST,
    }),
  };
}

function invitationEmail(lang) {
  const v = LOGTO_VARS;
  const subject = t(lang, 'email.invitation.subject', v);
  return {
    subject,
    content: page({
      lang,
      title: subject,
      preheader: t(lang, 'email.invitation.expires', v),
      title1: t(lang, 'email.invitation.title1', v),
      title2: t(lang, 'email.invitation.title2', v),
      content:
        p(strong(t(lang, 'email.invitation.greeting', v))) +
        p(t(lang, 'email.invitation.body', v)) +
        business('{{workspaceEmoji}}', v.workspace, t(lang, 'email.invitation.employer', v)) +
        button('{{link}}', t(lang, 'email.invitation.action')) +
        small(t(lang, 'email.invitation.expires', v)),
      footer: [t(lang, 'email.common.footer')],
      site: SITE,
      siteHost: SITE_HOST,
    }),
  };
}

function logtoBundle() {
  const templates = [];
  for (const lang of LANGS) {
    for (const [type, prefix] of Object.entries(CODE_TEMPLATES)) {
      templates.push({
        languageTag: lang,
        templateType: type,
        details: { ...codeEmail(lang, prefix), contentType: 'text/html' },
      });
    }
    templates.push({
      languageTag: lang,
      templateType: 'OrganizationInvitation',
      details: { ...invitationEmail(lang), contentType: 'text/html' },
    });
  }
  return `${JSON.stringify({ generatedBy: 'scripts/emails/build.mjs; do not edit, run npm run emails', templates }, null, 2)}\n`;
}

// The digest in Qute: texts arrive already translated from DigestJob (the `m` DigestMail record), the layout is shared.
function digestTemplate() {
  const q = (expr) => `{${expr}}`;
  const grid = `<table role="presentation" width="100%" cellpadding="0" cellspacing="5" border="0" style="margin:0 -5px;table-layout:fixed;">
<tr>{#for d in w.days}<td ${cell.label}>{d.label}</td>{/for}</tr>
<tr>{#for d in w.days}{#if d.hot}<td ${cell.hot}>{d.value}</td>{#else if d.off}<td ${cell.off}>{d.value}</td>{#else}<td ${cell.hours}>{d.value}</td>{/if}{/for}</tr>
</table>`;
  // Employer only: one row per person, Monday to Sunday and the week; a day without hours is a muted dash. Column
  // widths sit on the header cells (the fixed layout reads them from the first row): the name 28 percent and
  // wrapping, seven days and the total sharing the rest, so the table fits a 360 px phone. Past the email's row cap
  // a line says how many more people only the workbook lists.
  const team = `{#if w.team || w.morePeopleLine}
<p ${digest.heading}>{m.teamTitle}</p>
{#if w.team}<table ${digest.table}>
<tr><th width="28%" ${digest.thName}>&nbsp;</th>{#for d in w.days}<th width="8.5%" ${digest.th}>{d.label}</th>{/for}<th width="12.5%" ${digest.thTotal}>{m.totalLabel}</th></tr>
{#for r in w.team}<tr><td ${digest.name}>{r.name}</td>{#for c in r.days}{#if c.zero}<td ${digest.zero}>{c.value}</td>{#else}<td ${digest.value}>{c.value}</td>{/if}{/for}<td ${digest.total}>{r.total}</td></tr>
{/for}</table>{/if}
{#if w.morePeopleLine}${small(q('w.morePeopleLine'))}{/if}
{/if}`;
  // Jobs per person per day: "Mon 20 Oct", then "09:00  Café Nord  4 h" lines (an employee's own list has no name).
  // A job with a title shows the title, its place muted underneath (CHQ-191).
  const jobs = `{#if w.people}
<p ${digest.heading}>{m.jobsTitle}</p>
{#for p in w.people}{#if p.name}<p ${digest.person}>{p.name} <span ${digest.personTotal}>{p.total}</span></p>{/if}
{#for d in p.days}<p ${digest.day}>{d.label}</p>
<table ${digest.lines}>{#for j in d.jobs}<tr><td ${digest.time}>{j.time}</td><td ${digest.place}>{j.label}{#if j.place}<br><span ${digest.placeUnder}>{j.place}</span>{/if}</td><td ${digest.hours}>{j.hours}</td></tr>{/for}</table>
{/for}{/for}
{/if}`;
  const files = `{#if w.fileLine}${small(q('w.fileLine'))}{/if}
{#if w.moreLine}${small(q('w.moreLine'))}{/if}`;
  const workspace = `{#for w in m.workspaces}
${business(q('w.emoji'), q('w.name'), q('w.range'))}
${grid}
${team}
${jobs}
${files}
${rows(row(q('w.hoursLabel'), q('w.hours')) + row(q('w.monthLabel'), q('w.monthHours')))}
<div style="height:14px;line-height:14px;">&nbsp;</div>
{/for}`;
  return page({
    lang: q('m.lang'),
    title: q('m.subject'),
    preheader: q('m.intro'),
    title1: q('m.title1'),
    title2: q('m.title2'),
    content: p(strong(q('m.greeting'))) + p(q('m.intro')) + workspace + button(q('m.webUrl'), q('m.action')),
    footer: [q('m.unsubscribe'), q('m.footer')],
    site: q('m.site'),
    siteHost: q('m.siteHost'),
    raw: (s) => `{|${s}|}`,
  });
}

const outputs = [
  [LOGTO_OUT, logtoBundle()],
  [DIGEST_OUT, digestTemplate()],
];
if (process.argv.includes('--check')) {
  const stale = outputs.filter(([file, text]) => {
    try {
      return readFileSync(file, 'utf8') !== text;
    } catch {
      return true;
    }
  });
  for (const [file] of stale) console.error(`emails: ${file} is out of date; run npm run emails`);
  if (stale.length) process.exit(1);
  console.log('emails: templates match the catalogue');
} else {
  for (const [file, text] of outputs) writeFileSync(file, text);
  console.log(`emails: wrote ${outputs.map(([f]) => f.replace(root(''), '')).join(', ')}`);
}
