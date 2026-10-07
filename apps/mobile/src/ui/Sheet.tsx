import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from 'react';
import {
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
  type HostInstance,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { BottomSheetModal, BottomSheetView } from '@expo/ui/community/bottom-sheet';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RaisedTheme, raisedTheme, useTheme, useThemedStyles, type Theme } from '@/theme';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { offsetToReveal } from './keyboardReveal';
import { AppPressable } from './Pressable';

// The one seam over the native bottom sheet (@expo/ui, Compose ModalBottomSheet on Android). Every
// sheet in the app is an AppSheet, so the gesture area, the close button and the safe-area padding
// are decided once. Content sizes the sheet (no snap points); a body taller than the screen scrolls under
// the fixed header, capped here once instead of per sheet (CHQ-162). Neither native sheet moves its content for
// the keyboard, so the body scrolls the focused field above it on every phone size (CHQ-166). The scroll follows
// the caret, so the gap is the tallest field (the two-row note) to keep the whole box in view, not just its first line.
// That is iOS. On Android the sheet is its own window, where the keyboard library sees no keyboard, while the native
// sheet itself lifts its content above the keyboard (CHQ-175). There the body shrinks by the keyboard React Native
// reports, so the header stays on screen, and scrolls the focused field until all of it is above the keyboard.
const CLOSE = 36;

export interface SheetHandle {
  present: () => void;
  dismiss: () => void;
}

export interface AppSheetProps {
  title?: string | undefined;
  subtitle?: string | undefined;
  closeLabel: string;
  // False on a sheet's sub-page (a step reached from the main page): it shows only its own Back, so the close
  // button cannot throw away what the main page holds. Swiping the sheet down still closes it.
  showClose?: boolean;
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
  { title, subtitle, closeLabel, showClose = true, onDismiss, children, testID },
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
          showClose={showClose}
          onClose={() => sheet.current?.dismiss()}
          testID={testID}
        >
          {children}
        </SheetBody>
      </RaisedTheme>
    </BottomSheetModal>
  );
});

// The keyboard's height on Android, from React Native's own events (they reach the sheet's window); 0 when hidden
// and always 0 on iOS, where KeyboardAwareScrollView handles it.
function useAndroidKeyboard(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', (e) => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}

// The sheet's content, rendered inside RaisedTheme so its own close button and everything in it read the
// sheet's surfaces.
function SheetBody({
  title,
  subtitle,
  closeLabel,
  showClose,
  onClose,
  children,
  testID,
}: Omit<AppSheetProps, 'onDismiss'> & { onClose: () => void }) {
  const theme = useTheme();
  const s = useThemedStyles(styles);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const keyboard = useAndroidKeyboard();
  const scroll = useRef<ScrollView>(null);
  const offset = useRef(0);
  const [viewport, setViewport] = useState(0);
  // The cap: the screen less the status bar, the navigation bar, the sheet's own handle and header and, on Android,
  // the keyboard the native sheet lifts it above.
  const maxBody = height - insets.top - insets.bottom - theme.space[13] - keyboard;
  // Once the body has its keyboard height, bring the focused field (all of it) into the visible part.
  useEffect(() => {
    if (keyboard === 0 || viewport === 0) return;
    const field = TextInput.State.currentlyFocusedInput();
    // getInnerViewRef is public at runtime (ScrollView's Flow types) but missing from React Native's .d.ts.
    const content = (
      scroll.current as unknown as { getInnerViewRef(): HostInstance | null } | null
    )?.getInnerViewRef();
    if (!field || !content) return;
    const frame = requestAnimationFrame(() =>
      field.measureLayout(content, (_x, y, _width, fieldHeight) => {
        const next = offsetToReveal(
          { y, height: fieldHeight },
          { offset: offset.current, height: viewport },
          theme.space[4],
        );
        if (next !== null) scroll.current?.scrollTo({ y: next, animated: true });
      }),
    );
    return () => cancelAnimationFrame(frame);
  }, [keyboard, viewport, theme.space]);
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
            {showClose ? (
              <AppPressable
                accessibilityRole="button"
                accessibilityLabel={closeLabel}
                onPress={onClose}
                hitSlop={(theme.tapMin - CLOSE) / 2}
                style={s.close}
                testID="sheet-close"
              >
                <Icon name="x" size={18} />
              </AppPressable>
            ) : null}
          </View>
        ) : null}
        {Platform.OS === 'ios' ? (
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
        ) : (
          <ScrollView
            ref={scroll}
            style={[s.scroll, { maxHeight: maxBody }]}
            contentContainerStyle={s.scrollContent}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            onLayout={(e) => setViewport(e.nativeEvent.layout.height)}
            onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
              offset.current = e.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}
            testID="sheet-scroll"
          >
            {children}
          </ScrollView>
        )}
      </View>
    </BottomSheetView>
  );
}
