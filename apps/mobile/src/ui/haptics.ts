import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

// One helper for every haptic, mapping to the Android haptics engine (no VIBRATE permission) and to
// the iOS impact/notification generators (docs/research/mobile.md section 4).
export type HapticKind = 'tick' | 'select' | 'confirm' | 'success' | 'warning' | 'error';

export async function haptic(kind: HapticKind): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      switch (kind) {
        case 'tick':
          return await Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Segment_Tick);
        case 'select':
          return await Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Virtual_Key);
        case 'confirm':
        case 'success':
          return await Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm);
        case 'warning':
        case 'error':
          return await Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Reject);
      }
    }
    switch (kind) {
      case 'tick':
        return await Haptics.selectionAsync();
      case 'select':
        return await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      case 'confirm':
        return await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      case 'success':
        return await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      case 'warning':
        return await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      case 'error':
        return await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  } catch {
    // A phone without a haptics engine is not an error the user needs to hear about.
  }
}
