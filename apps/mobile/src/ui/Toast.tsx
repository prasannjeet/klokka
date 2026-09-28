import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOut, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export type ToastTone = 'success' | 'danger' | 'neutral';

interface ToastState {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  show: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue>({ show: () => undefined });

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

const styles = (t: Theme) =>
  StyleSheet.create({
    host: { position: 'absolute', left: t.space[4], right: t.space[4], alignItems: 'center' },
    toast: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.space[2],
      paddingHorizontal: t.space[4],
      paddingVertical: t.space[3],
      borderRadius: t.radius.pill,
      backgroundColor: t.color.text,
      maxWidth: '100%',
    },
  });

const TOAST_MS = 2600;

// One toast at a time, popping in from the bottom (DIRECTION.md: Pop), fading out.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const counter = useRef(0);
  const show = useCallback((message: string, tone: ToastTone = 'success') => {
    counter.current += 1;
    setToast({ id: counter.current, message, tone });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), TOAST_MS);
  }, []);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const value = useMemo(() => ({ show }), [show]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastHost toast={toast} />
    </ToastContext.Provider>
  );
}

export function Toast({ message, tone }: { message: string; tone: ToastTone }) {
  const theme = useTheme();
  const s = useThemedStyles(styles);
  const icon: IconName = tone === 'danger' ? 'alert' : tone === 'success' ? 'check' : 'info';
  const fg = theme.color.bg;
  return (
    <View style={s.toast} accessibilityLiveRegion="polite" accessibilityRole="alert" testID="toast">
      <Icon name={icon} size={18} color={tone === 'danger' ? theme.color.pop3 : fg} />
      <AppText variant="small" weight={600} color={fg} numberOfLines={3} style={{ flexShrink: 1 }}>
        {message}
      </AppText>
    </View>
  );
}

function ToastHost({ toast }: { toast: ToastState | null }) {
  const s = useThemedStyles(styles);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  if (!toast) return null;
  return (
    <View pointerEvents="none" style={[s.host, { bottom: insets.bottom + theme.space[11] }]}>
      <Animated.View
        key={toast.id}
        entering={reduced ? undefined : FadeInDown.duration(theme.motion.duration.base)}
        exiting={reduced ? undefined : FadeOut.duration(theme.motion.duration.base)}
      >
        <Toast message={toast.message} tone={toast.tone} />
      </Animated.View>
    </View>
  );
}
