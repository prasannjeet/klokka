import { Switch, type SwitchProps } from 'react-native';
import { useTheme } from '@/theme';
import { haptic } from './haptics';

// The platform switch in Klokka's colours, with a haptic on every flip.
export function AppSwitch({ onValueChange, ...rest }: SwitchProps) {
  const theme = useTheme();
  return (
    <Switch
      {...rest}
      trackColor={{ false: theme.color.border, true: theme.color.primary }}
      thumbColor={theme.color.surface}
      ios_backgroundColor={theme.color.border}
      onValueChange={(value) => {
        void haptic('tick');
        onValueChange?.(value);
      }}
    />
  );
}
