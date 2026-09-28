import { Switch, type SwitchProps } from 'react-native';
import { useTheme, type Theme } from '@/theme';
import { haptic } from './haptics';

// Thumb and track never share a colour (CHQ-145: in dark mode the surface-coloured thumb vanished
// into the border-coloured track). Off: the muted text colour on the border track; on: the lightest
// colour of the mode on the primary track. Both pairs are tokens in both modes.
export function switchColors(theme: Theme, on: boolean) {
  return {
    track: on ? theme.color.primary : theme.color.border,
    thumb: on ? (theme.mode === 'dark' ? theme.color.text : theme.color.surface) : theme.color.textMuted,
  };
}

// The platform switch in Klokka's colours, with a haptic on every flip.
export function AppSwitch({ onValueChange, value, ...rest }: SwitchProps) {
  const theme = useTheme();
  const off = switchColors(theme, false);
  const on = switchColors(theme, true);
  return (
    <Switch
      {...rest}
      value={value}
      trackColor={{ false: off.track, true: on.track }}
      thumbColor={value ? on.thumb : off.thumb}
      ios_backgroundColor={off.track}
      onValueChange={(next) => {
        void haptic('tick');
        onValueChange?.(next);
      }}
    />
  );
}
