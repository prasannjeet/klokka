import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// @klokka/core is consumed by Next.js (server and browser) and by React Native. It must never touch a
// browser global, the DOM, React, React Native or Node-only modules (tax-agent precedent, KUL-120).
const SRC = fileURLToPath(new URL('../src', import.meta.url));

function authoredSources(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) authoredSources(p, acc);
    else if (name.endsWith('.ts') && !name.endsWith('.generated.ts')) acc.push(p);
  }
  return acc;
}

const BROWSER_GLOBALS: { name: string; pattern: RegExp }[] = [
  { name: 'window', pattern: /\bwindow\s*[.[]/ },
  { name: 'document', pattern: /\bdocument\s*[.[]/ },
  { name: 'navigator', pattern: /\bnavigator\s*[.[]/ },
  { name: 'localStorage', pattern: /\blocalStorage\b/ },
  { name: 'sessionStorage', pattern: /\bsessionStorage\b/ },
];

const FORBIDDEN_IMPORT =
  /\bfrom\s+['"](react|react-dom|react-native|expo(?:-[^'"]+)?|next(?:\/[^'"]+)?|@react-native\/[^'"]+|node:[^'"]+|fs|path|os|child_process)['"]/;

describe('@klokka/core stays platform neutral', () => {
  const files = authoredSources(SRC);
  const rel = (f: string) => relative(SRC, f);

  it('scans the modules that matter', () => {
    expect(files.map(rel)).toEqual(
      expect.arrayContaining(['index.ts', 'hours.ts', 'month.ts', 'format.ts', 'i18n/index.ts']),
    );
  });

  it('references no browser-only global', () => {
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      for (const g of BROWSER_GLOBALS) if (g.pattern.test(src)) offenders.push(`${rel(f)} ~ ${g.name}`);
    }
    expect(offenders).toEqual([]);
  });

  it('imports neither a UI framework nor a Node module', () => {
    const offenders = files.filter((f) => FORBIDDEN_IMPORT.test(readFileSync(f, 'utf8'))).map(rel);
    expect(offenders).toEqual([]);
  });

  it('each guard fires on a representative violation', () => {
    const samples = [
      'window.location',
      'document.cookie',
      'navigator.language',
      'localStorage.x',
      'sessionStorage.y',
    ];
    expect(samples).toHaveLength(BROWSER_GLOBALS.length);
    samples.forEach((s, i) => expect(BROWSER_GLOBALS[i]!.pattern.test(s)).toBe(true));
    for (const bad of [
      "import { View } from 'react-native'",
      "import { useState } from 'react'",
      "import { readFileSync } from 'node:fs'",
      "import { headers } from 'next/headers'",
      "import * as Localization from 'expo-localization'",
    ]) {
      expect(FORBIDDEN_IMPORT.test(bad), bad).toBe(true);
    }
    expect(FORBIDDEN_IMPORT.test("import { parseMonth } from './month.ts'")).toBe(false);
  });

  it('declares no runtime dependency', () => {
    const pkg = JSON.parse(
      readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'),
    ) as {
      dependencies?: Record<string, string>;
    };
    expect(Object.keys(pkg.dependencies ?? {})).toEqual([]);
  });
});
