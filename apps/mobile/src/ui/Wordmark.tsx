import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { fontFamily, useTheme } from '@/theme';
import { AppText } from './AppText';

// The mark (a clock face with the paddle) and the lowercase wordmark, in the theme primary.
export function Mark({ size = 28, color }: { size?: number; color?: string }) {
  const theme = useTheme();
  const c = color ?? theme.color.primary;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <Circle cx="12" cy="12" r="10" stroke={c} strokeWidth="3" fill="none" />
      <Path
        d="M12 6v6l4 3"
        stroke={c}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export function Wordmark({ size = 28 }: { size?: number }) {
  const theme = useTheme();
  return (
    <View style={styles.row} accessible accessibilityRole="header" accessibilityLabel="Klokka">
      <Mark size={size} />
      <AppText
        variant="h2"
        weight={800}
        color={theme.color.text}
        style={[fontFamily('display', 800), { fontSize: size, lineHeight: size * 1.2 }]}
      >
        klokka
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
