// The one email layout (CHQ-148): klokka.se's look in a table-based shell every mail client renders. build.mjs uses
// it for the Logto templates and for the API's Qute digest template, so both kinds of email share every measurement.
// Colours are the Nightshift tokens (packages/tokens) written out, because email clients cannot read CSS variables;
// the dark set applies where the reader's mail app is in dark mode and honours prefers-color-scheme (Apple Mail).

export const LOGO = 'https://nexus.coolify.ooguy.com/repository/klokka-downloads/brand/klokka-mark-heavy.png';

const C = {
  bg: '#F5F1FF',
  card: '#FFFFFF',
  cell: '#ECE4FF',
  text: '#160B33',
  muted: '#5A4A8C',
  border: '#D8CCF5',
  pink: '#FF006E',
  dark: {
    bg: '#0D0620',
    card: '#1A1033',
    cell: '#27184D',
    text: '#F4EFFF',
    muted: '#B4A4E4',
    border: '#3A2A6A',
    onPink: '#0D0620',
  },
};
const DISPLAY = "Unbounded,'Arial Black','Helvetica Neue',Arial,sans-serif";
const BODY = "Inter,-apple-system,'Segoe UI',Roboto,Arial,sans-serif";
const MONO = "'JetBrains Mono',Menlo,Consolas,monospace";

export const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// `raw` wraps text a template engine must not parse (Qute reads every `{`); identity for Logto.
export function page({
  lang,
  title,
  preheader,
  title1,
  title2,
  content,
  footer,
  site,
  siteHost,
  raw = (s) => s,
}) {
  const style = raw(`
    body { margin: 0; padding: 0; background: ${C.bg}; }
    a { color: inherit; }
    @media (prefers-color-scheme: dark) {
      .k-bg { background: ${C.dark.bg} !important; }
      .k-card { background: ${C.dark.card} !important; border-color: ${C.dark.border} !important; }
      .k-text { color: ${C.dark.text} !important; }
      .k-muted { color: ${C.dark.muted} !important; }
      .k-cell { background: ${C.dark.cell} !important; color: ${C.dark.text} !important; }
      .k-free { border-color: ${C.dark.border} !important; color: ${C.dark.muted} !important; }
      .k-rule { border-color: ${C.dark.border} !important; }
      .k-on-pink { color: ${C.dark.onPink} !important; }
    }
    @media (max-width: 600px) {
      .k-pad { padding: 26px 20px !important; }
      .k-h { font-size: 25px !important; }
    }`);
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${title}</title>
<link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@800&amp;family=Inter:wght@400;600;700&amp;family=JetBrains+Mono:wght@700&amp;display=swap" rel="stylesheet">
<style>${style}
</style>
</head>
<body class="k-bg" style="margin:0;padding:0;background:${C.bg};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="k-bg" style="background:${C.bg};">
<tr><td align="center" style="padding:32px 12px 40px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="padding:0 6px 18px;">
<a href="${site}" style="text-decoration:none;"><img src="${LOGO}" width="28" height="28" alt="" style="vertical-align:middle;border:0;">
<span class="k-text" style="font-family:${DISPLAY};font-weight:800;font-size:22px;letter-spacing:-0.5px;color:${C.text};vertical-align:middle;">&nbsp;klokka</span></a>
</td></tr>
<tr><td class="k-card k-pad" style="background:${C.card};border:1px solid ${C.border};border-radius:24px;padding:32px 30px;">
<h1 class="k-h k-text" style="margin:0 0 18px;font-family:${DISPLAY};font-weight:800;font-size:30px;line-height:1.08;letter-spacing:-0.6px;color:${C.text};">${title1}<br><span style="color:${C.pink};">${title2}</span></h1>
${content}
</td></tr>
<tr><td style="padding:18px 8px 0;">
${footer.map((line) => `<p class="k-muted" style="margin:0 0 6px;font-family:${BODY};font-size:12px;line-height:1.55;color:${C.muted};">${line}</p>`).join('\n')}
<p class="k-muted" style="margin:0;font-family:${BODY};font-size:12px;line-height:1.55;color:${C.muted};"><a href="${site}" style="color:${C.muted};">${siteHost}</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
`;
}

export const p = (html) =>
  `<p class="k-muted" style="margin:0 0 16px;font-family:${BODY};font-size:16px;line-height:1.6;color:${C.muted};">${html}</p>`;

export const strong = (html) => `<strong class="k-text" style="color:${C.text};">${html}</strong>`;

export const small = (html) =>
  `<p class="k-muted" style="margin:16px 0 0;font-family:${BODY};font-size:13px;line-height:1.5;color:${C.muted};">${html}</p>`;

export const code = (
  value,
  label,
) => `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 0;">
<tr><td class="k-cell" aria-label="${label}" style="background:${C.cell};border-radius:14px;padding:16px 22px;font-family:${MONO};font-weight:700;font-size:30px;line-height:1;letter-spacing:8px;color:${C.text};">${value}</td></tr>
</table>`;

export const button = (
  href,
  label,
) => `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 0;">
<tr><td style="border-radius:999px;background:${C.pink};">
<a href="${href}" class="k-on-pink" style="display:inline-block;padding:16px 28px;font-family:${BODY};font-weight:700;font-size:16px;line-height:1;color:${C.text};text-decoration:none;border-radius:999px;">${label}</a>
</td></tr>
</table>`;

// A business card: emoji tile, name, one quiet line under it.
export const business = (
  emoji,
  name,
  line,
) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 18px;">
<tr><td class="k-cell" style="background:${C.cell};border-radius:16px;padding:14px 16px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="44" height="44" align="center" style="width:44px;height:44px;background:${C.pink};border-radius:12px;font-size:22px;line-height:44px;">${emoji}</td>
<td style="padding-left:12px;font-family:${BODY};">
<div class="k-text" style="font-weight:600;font-size:16px;line-height:1.3;color:${C.text};">${name}</div>
<div class="k-muted" style="font-size:13px;line-height:1.4;color:${C.muted};">${line}</div>
</td></tr></table>
</td></tr>
</table>`;

// Cell styles for the digest's week grid, one per state; build.mjs picks them in Qute.
export const cell = {
  label: `class="k-muted" style="padding:0 2px 6px;font-family:${BODY};font-weight:600;font-size:11px;letter-spacing:0.4px;color:${C.muted};text-align:center;"`,
  hours: `class="k-cell" style="background:${C.cell};border-radius:10px;height:40px;font-family:${BODY};font-weight:700;font-size:14px;color:${C.text};text-align:center;"`,
  hot: `style="background:${C.pink};border-radius:10px;height:40px;font-family:${BODY};font-weight:700;font-size:14px;color:${C.text};text-align:center;" class="k-on-pink"`,
  off: `class="k-free" style="border:1px solid ${C.border};border-radius:10px;height:38px;font-family:${BODY};font-size:12px;color:${C.muted};text-align:center;"`,
};

export const row = (label, value) => `<tr>
<td class="k-muted k-rule" style="padding:10px 0;border-bottom:1px solid ${C.border};font-family:${BODY};font-size:15px;color:${C.muted};">${label}</td>
<td class="k-text k-rule" align="right" style="padding:10px 0;border-bottom:1px solid ${C.border};font-family:${BODY};font-size:15px;font-weight:700;color:${C.text};">${value}</td>
</tr>`;

export const rows = (inner) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="k-rule" style="margin:18px 0 0;border-top:1px solid ${C.border};">${inner}</table>`;
