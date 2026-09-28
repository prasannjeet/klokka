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

export const WORKSPACE_EMOJIS = ['☕', '✂️', '✨', '🍞', '🌼', '🚲', '🛍️', '🎨'] as const;
export const AVATAR_EMOJIS = ['☀️', '⭐', '🐱', '🚀', '🌿', '🌊', '🎵', '🐝'] as const;

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
