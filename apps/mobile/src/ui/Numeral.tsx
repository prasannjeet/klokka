import { StyleSheet, View } from 'react-native';
import { useTheme, type TypeRole } from '@/theme';
import { AppText } from './AppText';

export interface NumeralProps {
  value: string;
  unit?: string | undefined;
  variant?: TypeRole;
  color?: string;
  accessibilityLabel?: string;
  testID?: string;
}

// The big number with its small unit hanging off the baseline ("92.5 h").
export function Numeral({
  value,
  unit,
  variant: role = 'displayL',
  color,
  accessibilityLabel,
  testID,
}: NumeralProps) {
  const theme = useTheme();
  const unitRole: TypeRole =
    role === 'displayXl' || role === 'displayL' ? 'h3' : role === 'h1' ? 'lead' : 'small';
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={accessibilityLabel ?? `${value} ${unit ?? ''}`.trim()}
      testID={testID}
    >
      <AppText variant={role} color={color ?? theme.color.text}>
        {value}
      </AppText>
      {unit ? (
        <AppText variant={unitRole} weight={700} color={color ?? theme.color.textMuted} style={styles.unit}>
          {unit}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  unit: { paddingBottom: 2 },
});
