import { StyleSheet, View } from 'react-native';
import type { WorkspaceColour } from '@klokka/api-client';
import { useTheme } from '@/theme';
import { AppText } from './AppText';

export interface AvatarProps {
  // An emoji avatar, or the initial of the name when there is none.
  name: string;
  emoji?: string | null | undefined;
  colour?: WorkspaceColour | undefined;
  size?: number;
  // A square tile (workspaces) rather than a circle (people).
  square?: boolean;
}

export function initialOf(name: string): string {
  const trimmed = name.trim();
  return trimmed === '' ? '?' : (trimmed[0] as string).toLocaleUpperCase();
}

export function Avatar({ name, emoji, colour = 'PURPLE', size = 40, square }: AvatarProps) {
  const theme = useTheme();
  const { fill, on } = theme.workspace(colour);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[
        styles.box,
        {
          width: size,
          height: size,
          borderRadius: square ? theme.radius.sm : size / 2,
          backgroundColor: emoji ? theme.color.surface2 : fill,
        },
      ]}
    >
      {emoji ? (
        <AppText style={{ fontSize: size * 0.5, lineHeight: size * 0.7 }}>{emoji}</AppText>
      ) : (
        <AppText
          variant="small"
          weight={700}
          color={on}
          style={{ fontSize: size * 0.42, lineHeight: size * 0.6 }}
        >
          {initialOf(name)}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
});
