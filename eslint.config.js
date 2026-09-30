// Root ESLint 9 flat config. Every workspace is linted from here (`npm run lint`), so the rules below
// apply to packages/* and, once they exist, apps/web, apps/landing and apps/mobile. App-specific
// presets (eslint-config-next, eslint-config-expo) are layered on in each app's own config later.
import js from '@eslint/js';
import prettier from 'eslint-config-prettier/flat';
import tseslint from 'typescript-eslint';

// AGENTS.md: no em dash in any user-facing text. Three selectors so JSX text is covered too (tax-agent's
// two selectors missed it, see docs/research/web.md section 8).
const EM_DASH_MESSAGE = 'No em dash. Use a comma, colon, parentheses or a period.';
const noEmDash = {
  'no-restricted-syntax': [
    'error',
    { selector: 'Literal[value=/\\u2014/]', message: EM_DASH_MESSAGE },
    { selector: 'TemplateElement[value.raw=/\\u2014/]', message: EM_DASH_MESSAGE },
    { selector: 'JSXText[value=/\\u2014/]', message: EM_DASH_MESSAGE },
  ],
};

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/.expo/**',
      '**/target/**',
      'apps/api/**',
      'apps/mobile/android/**',
      'apps/mobile/ios/**',
      'docs/**',
      'packages/api-client/src/generated/**',
      '**/*.generated.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,mjs,cjs}'],
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { console: 'readonly', process: 'readonly', URL: 'readonly' },
    },
    rules: {
      ...noEmDash,
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          vars: 'all',
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    },
  },
  // The landing's own config (apps/landing/eslint.config.mjs) adds Next's rules, and its disable directives
  // name those rules; this config has no Next plugin, so it would report them as unused. The landing's own lint
  // still reports unused directives.
  {
    files: ['apps/landing/**'],
    linterOptions: { reportUnusedDisableDirectives: 'off' },
  },
  prettier,
);
