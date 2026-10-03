import { useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useThemedStyles, type Theme } from '@/theme';
import { AppText } from './AppText';
import { haptic } from './haptics';
import { AppPressable } from './Pressable';

export interface WheelProps {
  values: readonly number[];
  value: number;
  onChange: (value: number) => void;
  format: (value: number) => string;
  // The unit printed beside the selected row ("h", "min").
  unit: string;
  accessibilityLabel: string;
  testID?: string;
}

// Five rows show; the middle one is the value. Row height is the tap minimum, so every row is a target.
const VISIBLE = 5;

const styles = (t: Theme) =>
  StyleSheet.create({
    wrap: { flex: 1, height: t.tapMin * VISIBLE },
    content: { paddingVertical: t.tapMin * Math.floor(VISIBLE / 2) },
    row: { height: t.tapMin, alignItems: 'center', justifyContent: 'center' },
    unit: {
      position: 'absolute',
      right: t.space[4],
      top: t.tapMin * Math.floor(VISIBLE / 2),
      height: t.tapMin,
      justifyContent: 'center',
    },
  });

// A scroll wheel (the alarm-clock picker): drag or fling and it snaps to a row, tap a row to jump to it,
// and TalkBack/VoiceOver adjust it one step at a time. The parent owns the value; a value set from outside
// (a quick-pick chip) scrolls the wheel to it.
export function Wheel({ values, value, onChange, format, unit, accessibilityLabel, testID }: WheelProps) {
  const s = useThemedStyles(styles);
  const scroll = useRef<ScrollView>(null);
  const row = s.row.height;
  const index = Math.max(0, values.indexOf(value));
  // The row under the band while a finger moves it; the parent hears about it as it changes.
  const [live, setLive] = useState(index);
  const shown = useRef(index);

  useEffect(() => {
    if (index !== shown.current) {
      shown.current = index;
      setLive(index);
      scroll.current?.scrollTo({ y: index * row, animated: true });
    }
  }, [index, row]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.min(values.length - 1, Math.max(0, Math.round(e.nativeEvent.contentOffset.y / row)));
    if (i === shown.current) return;
    shown.current = i;
    setLive(i);
    void haptic('tick');
    onChange(values[i] as number);
  };

  const step = (by: 1 | -1) => {
    const i = Math.min(values.length - 1, Math.max(0, index + by));
    if (i !== index) onChange(values[i] as number);
  };

  return (
    <View
      style={s.wrap}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: `${format(value)} ${unit}` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
      testID={testID}
    >
      <ScrollView
        ref={scroll}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={row}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={onScroll}
        onLayout={() => scroll.current?.scrollTo({ y: shown.current * row, animated: false })}
        contentContainerStyle={s.content}
      >
        {values.map((v, i) => {
          const distance = Math.abs(i - live);
          return (
            <AppPressable
              key={v}
              style={s.row}
              onPress={() => onChange(v)}
              importantForAccessibility="no"
              hapticKind={null}
              testID={testID ? `${testID}-${v}` : undefined}
            >
              <AppText
                variant={distance === 0 ? 'h2' : 'h3'}
                weight={700}
                tone={distance === 0 ? 'text' : 'muted'}
                style={[{ lineHeight: row }, distance > 1 ? { opacity: 0.45 } : null]}
              >
                {format(v)}
              </AppText>
            </AppPressable>
          );
        })}
      </ScrollView>
      <View style={s.unit} pointerEvents="none">
        <AppText variant="small" weight={700} tone="muted">
          {unit}
        </AppText>
      </View>
    </View>
  );
}
