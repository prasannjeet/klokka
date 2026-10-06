import { forwardRef, useImperativeHandle, useRef, type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { BottomSheetModal, BottomSheetView } from '@expo/ui/community/bottom-sheet';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RaisedTheme, raisedTheme, useTheme, useThemedStyles, type Theme } from '@/theme';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { AppPressable } from './Pressable';

// The one seam over the native bottom sheet (@expo/ui, Compose ModalBottomSheet on Android). Every
// sheet in the app is an AppSheet, so the gesture area, the close button and the safe-area padding
// are decided once. Content sizes the sheet (no snap points); a body taller than the screen scrolls under
// the fixed header, capped here once instead of per sheet (CHQ-162). Neither native sheet moves its content for
// the keyboard, so the body scrolls the focused field above it on every phone size (CHQ-166). The scroll follows
// the caret, so the gap is the tallest field (the two-row note) to keep the whole box in view, not just its first line.
const CLOSE = 36;

export interface SheetHandle {
  present: () => void;
  dismiss: () => void;
}

export interface AppSheetProps {
  title?: string | undefined;
  subtitle?: string | undefined;
  closeLabel: string;
  onDismiss?: () => void;
  children?: ReactNode;
  testID?: string;
}

const styles = (t: Theme) =>
  StyleSheet.create({
    // Side padding lives on the header and inside the scroll view, so rows that bleed to the sheet's edge
    // (OptionSheet's selected row) are not clipped by the ScrollView.
    content: { paddingTop: t.space[2] },
    body: { gap: t.space[4] },
    scroll: { flexGrow: 0 },
    scrollContent: { paddingHorizontal: t.space[4] },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: t.space[3],
      paddingHorizontal: t.space[4],
    },
    headerText: { flex: 1, minWidth: 0 },
    close: {
      width: CLOSE,
      height: CLOSE,
      borderRadius: t.radius.chip,
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
      backgroundStyle={{ backgroundColor: raisedTheme(theme).color.surface }}
    >
      <RaisedTheme>
        <SheetBody
          title={title}
          subtitle={subtitle}
          closeLabel={closeLabel}
          onClose={() => sheet.current?.dismiss()}
          testID={testID}
        >
          {children}
        </SheetBody>
      </RaisedTheme>
    </BottomSheetModal>
  );
});

// The sheet's content, rendered inside RaisedTheme so its own close button and everything in it read the
// sheet's surfaces.
function SheetBody({
  title,
  subtitle,
  closeLabel,
  onClose,
  children,
  testID,
}: Omit<AppSheetProps, 'onDismiss'> & { onClose: () => void }) {
  const theme = useTheme();
  const s = useThemedStyles(styles);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  // The cap: the screen less the status bar, the navigation bar and the sheet's own handle and header.
  const maxBody = height - insets.top - insets.bottom - theme.space[13];
  return (
    <BottomSheetView style={[s.content, { paddingBottom: insets.bottom + theme.space[5] }]}>
      <View testID={testID} style={s.body}>
        {title ? (
          <View style={s.header}>
            <View style={s.headerText}>
              <AppText variant="h3" accessibilityRole="header">
                {title}
              </AppText>
              {subtitle ? (
                <AppText variant="small" tone="muted">
                  {subtitle}
                </AppText>
              ) : null}
            </View>
            <AppPressable
              accessibilityRole="button"
              accessibilityLabel={closeLabel}
              onPress={onClose}
              hitSlop={(theme.tapMin - CLOSE) / 2}
              style={s.close}
            >
              <Icon name="x" size={18} />
            </AppPressable>
          </View>
        ) : null}
        <KeyboardAwareScrollView
          style={[s.scroll, { maxHeight: maxBody }]}
          contentContainerStyle={s.scrollContent}
          bottomOffset={theme.tapMin * 2}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          {children}
        </KeyboardAwareScrollView>
      </View>
    </BottomSheetView>
  );
}
