// Workspace colours and people avatars. Workspace colours map to theme tokens so every colour exists in
// every theme and mode (docs/design/DIRECTION.md section 8: --primary, --chart-2..4, --pop-2, --secondary).
import type { WorkspaceColour } from '@klokka/api-client';

export const WORKSPACE_COLOURS: readonly WorkspaceColour[] = [
  'PRIMARY',
  'BLUE',
  'GREEN',
  'PURPLE',
  'YELLOW',
  'INK',
];

const COLOUR_VAR: Record<WorkspaceColour, string> = {
  PRIMARY: 'var(--primary)',
  BLUE: 'var(--chart-2)',
  GREEN: 'var(--chart-3)',
  PURPLE: 'var(--chart-4)',
  YELLOW: 'var(--pop-2)',
  INK: 'var(--secondary)',
};

export function colourVar(colour: WorkspaceColour): string {
  return COLOUR_VAR[colour] ?? COLOUR_VAR.PRIMARY;
}

// Avatar emoji choices with the catalogue key of their accessible name (business icons: WORKSPACE_EMOJIS in
// @klokka/core).
export const AVATAR_EMOJIS = [
  ['\u2600\uFE0F', 'sun'],
  ['\u2B50', 'star'],
  ['\uD83D\uDC31', 'cat'],
  ['\uD83D\uDE80', 'rocket'],
  ['\uD83C\uDF3F', 'leaf'],
  ['\uD83C\uDF0A', 'wave'],
  ['\uD83C\uDFB5', 'music'],
  ['\uD83D\uDC1D', 'bee'],
] as const;

// Avatar fill per person, cycling through the chart order so neighbours differ.
const AVATAR_CLASSES = ['', 'p', 'c3', 'c4', 'c2'] as const;

export function avatarClass(index: number): string {
  return AVATAR_CLASSES[index % AVATAR_CLASSES.length] ?? '';
}

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = words[0]?.[0] ?? '';
  return first.toLocaleUpperCase();
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}
