// Pushes Klokka's email templates and Swedish sign-in texts to one Logto (CHQ-148):
//   node scripts/emails/push-logto.mjs staging|production [--dry-run]
// 1. /api/email-templates: the 14 templates of infra/logto/email-templates.json (7 types x sv, en). Logto picks the
//    language from the sign-in page (ui_locales, then the browser) or, for invitations, the payload's `locale`.
// 2. The SMTP connector's own templates become the English ones: Logto falls back to them for any other language.
// 3. /api/custom-phrases/sv: Logto has no built-in Swedish; this adds it, which is also what makes `sv` resolvable.
// Credentials: .agents/local-credentials/logto.json (staging) or logto-prod.json (production), M2M app klokka-api.
/* global fetch */
import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import { URLSearchParams, fileURLToPath } from 'node:url';

const root = (path) => fileURLToPath(new URL(`../../${path}`, import.meta.url));
const ENVS = {
  staging: { credentials: 'logto.json', site: 'https://klokka.coolify.ooguy.com' },
  production: { credentials: 'logto-prod.json', site: 'https://klokka.se' },
};
const env = ENVS[process.argv[2]];
if (!env) {
  console.error('usage: push-logto.mjs staging|production [--dry-run]');
  process.exit(2);
}
const dryRun = process.argv.includes('--dry-run');
const creds = JSON.parse(readFileSync(root(`.agents/local-credentials/${env.credentials}`), 'utf8'));
const endpoint = creds.endpoint.replace(/\/+$/, '');
const m2m = creds.applications['klokka-api'];

const host = new URL(env.site).host;
const bundle = JSON.parse(readFileSync(root('infra/logto/email-templates.json'), 'utf8')).templates.map(
  (tpl) => ({
    ...tpl,
    details: {
      ...tpl.details,
      content: tpl.details.content.replaceAll('%%SITE_HOST%%', host).replaceAll('%%SITE%%', env.site),
    },
  }),
);
const phrases = JSON.parse(readFileSync(root('infra/logto/custom-phrases/sv.json'), 'utf8'));

async function token() {
  const res = await fetch(`${endpoint}/oidc/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${m2m.id}:${m2m.secret}`).toString('base64')}` },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      resource: 'https://default.logto.app/api',
      scope: 'all',
    }),
  });
  if (!res.ok) throw new Error(`token: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
}

async function call(bearer, method, path, body) {
  const res = await fetch(`${endpoint}${path}`, {
    method,
    headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

const bearer = await token();
const connectors = await call(bearer, 'GET', '/api/connectors');
const smtp = connectors.find((c) => c.connectorId === 'simple-mail-transfer-protocol');
if (!smtp) throw new Error('no SMTP connector in this Logto');
const english = bundle
  .filter((tpl) => tpl.languageTag === 'en')
  .map((tpl) => ({
    usageType: tpl.templateType,
    contentType: 'text/html',
    subject: tpl.details.subject,
    content: tpl.details.content,
  }));

console.log(
  `${process.argv[2]} (${endpoint}): ${bundle.length} templates, ${english.length} connector defaults, sv phrases, site ${env.site}`,
);
if (dryRun) process.exit(0);

await call(bearer, 'PUT', '/api/email-templates', { templates: bundle });
await call(bearer, 'PATCH', `/api/connectors/${smtp.id}`, { config: { ...smtp.config, templates: english } });
await call(bearer, 'PUT', '/api/custom-phrases/sv', phrases);

// Read back what Logto now holds, so a partial push cannot pass for a full one.
const stored = await call(bearer, 'GET', '/api/email-templates');
const missing = bundle.filter(
  (b) =>
    !stored.some(
      (s) =>
        s.languageTag === b.languageTag &&
        s.templateType === b.templateType &&
        s.details.content === b.details.content,
    ),
);
const connector = await call(bearer, 'GET', `/api/connectors/${smtp.id}`);
const sv = await call(bearer, 'GET', '/api/custom-phrases/sv');
if (missing.length || connector.config.templates.length !== english.length || !sv.translation.action) {
  console.error(
    `read-back failed: ${missing.length} templates differ, ${connector.config.templates.length} connector templates`,
  );
  process.exit(1);
}
console.log(
  `done: ${stored.length} email templates stored, connector defaults English, Swedish phrases in place`,
);
