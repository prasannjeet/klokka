import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// CHQ-162: on Android (Reanimated 4.5, New Architecture) a translating entering animation finishes its
// fade but leaves the 25 px translate behind, so rows and chips sat on top of their neighbours on every
// screen. Layout animations here may fade, never move.
const MOVING =
  /\b(?:Fade(?:In|Out)(?:Up|Down|Left|Right)|Slide\w*|Zoom\w*|Bounce\w*|Flip\w*|Stretch\w*|Roll\w*|Rotate\w*|LightSpeed\w*|Pinwheel\w*)\b/;

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe('layout animations', () => {
  const root = join(__dirname, '..', '..');
  const files = [...sources(join(root, 'src')), ...sources(join(root, 'app'))];

  it('scans the app sources', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('never translate an entering or exiting view', () => {
    const offenders = files.filter((file) => {
      const text = readFileSync(file, 'utf8');
      const imports = text.match(/import[^;]*from 'react-native-reanimated'/g) ?? [];
      return imports.some((line) => MOVING.test(line));
    });
    expect(offenders.map((file) => relative(root, file))).toEqual([]);
  });
});
