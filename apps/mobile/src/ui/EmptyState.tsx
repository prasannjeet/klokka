import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { AppText } from './AppText';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';

export interface EmptyStateProps {
  icon?: IconName;
  title: string;
  body?: string | undefined;
  actionLabel?: string | undefined;
  onAction?: (() => void) | undefined;
  testID?: string;
}

// Empty and error states share one shape: an icon, a sentence, an optional action.
export function EmptyState({ icon = 'info', title, body, actionLabel, onAction, testID }: EmptyStateProps) {
  const theme = useTheme();
  return (
    <View style={[styles.box, { gap: theme.space[3], padding: theme.space[6] }]} testID={testID}>
      <Icon name={icon} size={32} color={theme.color.textMuted} />
      <AppText variant="lead" weight={600} align="center">
        {title}
      </AppText>
      {body ? (
        <AppText variant="small" tone="muted" align="center">
          {body}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="outline" compact />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
});
