// Generates every Klokka email from one layout (layout.mjs) and the sv/en catalogue (CHQ-148):
//   infra/logto/email-templates.json                        the 7 Logto templates x 2 languages (push-logto.mjs)
//   apps/api/service/src/main/resources/templates/digest.html  the API's weekly digest (Qute)
// Both are committed. `--check` regenerates in memory and fails when a committed file differs.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { business, button, cell, code, esc, p, page, row, rows, small, strong } from './layout.mjs';

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
  const workspace = `{#for w in m.workspaces}
${business(q('w.emoji'), q('w.name'), q('w.range'))}
${grid}
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
