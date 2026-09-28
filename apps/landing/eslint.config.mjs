// The landing app's ESLint config: Next's presets layered on the repo's rules (root eslint.config.js, which
// `npm run lint` at the root also applies to this folder). Run with `npm run lint -w @klokka/landing`.
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';

const EM_DASH_MESSAGE = 'No em dash. Use a comma, colon, parentheses or a period.';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      'no-restricted-syntax': [
        'error',
        { selector: 'Literal[value=/\\u2014/]', message: EM_DASH_MESSAGE },
        { selector: 'TemplateElement[value.raw=/\\u2014/]', message: EM_DASH_MESSAGE },
        { selector: 'JSXText[value=/\\u2014/]', message: EM_DASH_MESSAGE },
      ],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    },
  },
  prettier,
  globalIgnores(['.next/**', 'next-env.d.ts', 'shots/**', 'test-results/**', 'playwright-report/**']),
]);
