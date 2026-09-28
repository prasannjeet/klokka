import { forwardRef, useImperativeHandle, useRef, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { BottomSheetModal, BottomSheetView } from '@expo/ui/community/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { AppPressable } from './Pressable';

// The one seam over the native bottom sheet (@expo/ui, Compose ModalBottomSheet on Android). Every
// sheet in the app is an AppSheet, so the gesture area, the close button and the safe-area padding
// are decided once. Content sizes the sheet (no snap points).
export interface SheetHandle {
  present: () => void;
  dismiss: () => void;
}

export interface AppSheetProps {
  title?: string | undefined;
  subtitle?: string | undefined;
  closeLabel: string;
  onDismiss?: () => void;
  children: ReactNode;
  testID?: string;
}

const styles = (t: Theme) =>
  StyleSheet.create({
    content: { paddingHorizontal: t.space[5], paddingTop: t.space[2], gap: t.space[4] },
    header: { flexDirection: 'row', alignItems: 'flex-start', gap: t.space[3] },
    headerText: { flex: 1, minWidth: 0 },
    close: {
      width: t.tapMin,
      height: t.tapMin,
      borderRadius: t.radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.color.surface2,
    },
  });

export const AppSheet = forwardRef<SheetHandle, AppSheetProps>(function AppSheet(
  { title, subtitle, closeLabel, onDismiss, children, testID },
  ref,
) {
  const theme = useTheme();
  const s = useThemedStyles(styles);
  const insets = useSafeAreaInsets();
  const sheet = useRef<BottomSheetModal>(null);
  useImperativeHandle(ref, () => ({
    present: () => sheet.current?.present(),
    dismiss: () => sheet.current?.dismiss(),
  }));
  return (
    <BottomSheetModal
      ref={sheet}
      enablePanDownToClose
      enableDynamicSizing
      onDismiss={onDismiss}
      backgroundStyle={{ backgroundColor: theme.color.surface }}
    >
      <BottomSheetView style={[s.content, { paddingBottom: insets.bottom + theme.space[6] }]}>
        <View testID={testID}>
          {title ? (
            <View style={s.header}>
              <View style={s.headerText}>
                <AppText variant="h3">{title}</AppText>
                {subtitle ? (
                  <AppText variant="small" tone="muted">
                    {subtitle}
                  </AppText>
                ) : null}
              </View>
              <AppPressable
                accessibilityRole="button"
                accessibilityLabel={closeLabel}
                onPress={() => sheet.current?.dismiss()}
                style={s.close}
              >
                <Icon name="x" size={20} />
              </AppPressable>
            </View>
          ) : null}
          {children}
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});
