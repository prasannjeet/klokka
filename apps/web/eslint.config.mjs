// The app's own lint (`npm run lint -w @klokka/web`): the repo rules (em dash in TS, JSX text and
// templates; type-only imports) plus Next's core-web-vitals and TypeScript presets, which also bring the
// React hooks rules. The root `npm run lint` applies the repo rules to this app as well.
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import repo from '../../eslint.config.js';

const config = [
  { ignores: ['.next/**', 'next-env.d.ts', 'node_modules/**', '.shots/**'] },
  ...nextVitals,
  ...nextTs,
  ...repo,
  {
    // The 401 handler reloads into /sign-in on purpose: the server must re-read the session cookie.
    files: ['src/app/providers.tsx'],
    rules: { '@next/next/no-location-assign-relative-destination': 'off' },
  },
];

export default config;
