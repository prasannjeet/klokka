/* eslint-disable @typescript-eslint/consistent-type-imports */
/* eslint-disable @typescript-eslint/no-require-imports */
// Fakes for native modules, with observable state, registered in jest.setup.ts. Each factory
// requires React lazily so nothing runs while the setup file is being evaluated.

type AnyRecord = Record<string, unknown>;

export function bottomSheetModule() {
  const React = require('react') as typeof import('react');
  const { View } = require('react-native') as typeof import('react-native');
  // A sheet is mounted content in tests: `present()` shows it, `dismiss()` hides it.
  function BottomSheetModal(
    props: AnyRecord & { children?: unknown; ref?: unknown; onDismiss?: () => void },
  ) {
    const [open, setOpen] = React.useState(false);
    React.useImperativeHandle(props.ref as React.Ref<unknown>, () => ({
      present: () => setOpen(true),
      dismiss: () => {
        setOpen(false);
        props.onDismiss?.();
      },
      close: () => setOpen(false),
      expand: () => setOpen(true),
      collapse: () => undefined,
      snapToIndex: (i: number) => setOpen(i >= 0),
      snapToPosition: () => undefined,
      forceClose: () => setOpen(false),
    }));
    if (!open) return null;
    return React.createElement(View, { testID: 'bottom-sheet' }, props.children as React.ReactNode);
  }
  function BottomSheetView(props: AnyRecord & { children?: unknown }) {
    return React.createElement(View, null, props.children as React.ReactNode);
  }
  const { ScrollView, TextInput } = require('react-native') as typeof import('react-native');
  return {
    __esModule: true,
    default: BottomSheetModal,
    BottomSheet: BottomSheetModal,
    BottomSheetModal,
    BottomSheetView,
    BottomSheetScrollView: ScrollView,
    BottomSheetTextInput: TextInput,
    BottomSheetModalProvider: ({ children }: { children: unknown }) => children,
  };
}

export const hapticCalls: string[] = [];
export function hapticsModule() {
  return {
    ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy', Rigid: 'rigid', Soft: 'soft' },
    NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
    AndroidHaptics: {
      Confirm: 'confirm',
      Reject: 'reject',
      Context_Click: 'context-click',
      Clock_Tick: 'clock-tick',
      Keyboard_Tap: 'keyboard-tap',
      Long_Press: 'long-press',
      Segment_Tick: 'segment-tick',
      Segment_Frequent_Tick: 'segment-frequent-tick',
      Virtual_Key: 'virtual-key',
      Gesture_Start: 'gesture-start',
      Gesture_End: 'gesture-end',
      Toggle_On: 'toggle-on',
      Toggle_Off: 'toggle-off',
    },
    impactAsync: async (style: string) => {
      hapticCalls.push(`impact:${style}`);
    },
    notificationAsync: async (type: string) => {
      hapticCalls.push(`notification:${type}`);
    },
    selectionAsync: async () => {
      hapticCalls.push('selection');
    },
    performAndroidHapticsAsync: async (kind: string) => {
      hapticCalls.push(`android:${kind}`);
    },
  };
}

export const secureStore = new Map<string, string>();
export function secureStoreModule() {
  return {
    getItemAsync: async (key: string) => secureStore.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => {
      secureStore.set(key, value);
    },
    deleteItemAsync: async (key: string) => {
      secureStore.delete(key);
    },
  };
}

export const notificationState = {
  permission: 'undetermined' as 'undetermined' | 'granted' | 'denied',
  // False once the user has refused the OS prompt for good: the OS no longer shows it.
  canAskAgain: true,
  channels: [] as AnyRecord[],
  handler: null as null | { handleNotification: (n: unknown) => Promise<unknown> },
  token: 'ExponentPushToken[test]',
  badge: 0,
  // The rotation listener and every getExpoPushTokenAsync call, so a test can emit a new device token.
  tokenListeners: [] as ((token: { type: string; data: string }) => void)[],
  expoTokenCalls: [] as unknown[],
  responseListeners: [] as ((response: unknown) => void)[],
  receivedListeners: [] as ((notification: unknown) => void)[],
  lastResponse: null as unknown,
};
// expo-device: a simulator or emulator reports isDevice false, and push needs a real phone.
export const deviceState = { isDevice: true };
export function deviceModule() {
  return {
    deviceName: 'Test phone',
    get isDevice() {
      return deviceState.isDevice;
    },
  };
}

export function notificationsModule() {
  return {
    AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3, LOW: 2, MIN: 1 },
    setNotificationHandler: (handler: { handleNotification: (n: unknown) => Promise<unknown> }) => {
      notificationState.handler = handler;
    },
    setNotificationChannelAsync: async (id: string, channel: AnyRecord) => {
      notificationState.channels.push({ id, ...channel });
      return { id, ...channel };
    },
    getPermissionsAsync: async () => ({
      status: notificationState.permission,
      granted: notificationState.permission === 'granted',
      canAskAgain: notificationState.canAskAgain,
    }),
    requestPermissionsAsync: async () => {
      if (notificationState.permission === 'undetermined') notificationState.permission = 'granted';
      return {
        status: notificationState.permission,
        granted: notificationState.permission === 'granted',
        canAskAgain: notificationState.canAskAgain,
      };
    },
    getExpoPushTokenAsync: async (options?: { devicePushToken?: { data: string } }) => {
      notificationState.expoTokenCalls.push(options);
      const device = options?.devicePushToken?.data;
      return { type: 'expo', data: device ? `ExponentPushToken[for-${device}]` : notificationState.token };
    },
    addPushTokenListener: (fn: (token: { type: string; data: string }) => void) => {
      notificationState.tokenListeners.push(fn);
      return {
        remove: () => {
          notificationState.tokenListeners = notificationState.tokenListeners.filter((f) => f !== fn);
        },
      };
    },
    addNotificationResponseReceivedListener: (fn: (r: unknown) => void) => {
      notificationState.responseListeners.push(fn);
      return {
        remove: () => {
          notificationState.responseListeners = notificationState.responseListeners.filter((f) => f !== fn);
        },
      };
    },
    addNotificationReceivedListener: (fn: (n: unknown) => void) => {
      notificationState.receivedListeners.push(fn);
      return {
        remove: () => {
          notificationState.receivedListeners = notificationState.receivedListeners.filter((f) => f !== fn);
        },
      };
    },
    getLastNotificationResponseAsync: async () => notificationState.lastResponse,
    setBadgeCountAsync: async (n: number) => {
      notificationState.badge = n;
      return true;
    },
  };
}

export const shareCalls: { uri: string; options: AnyRecord | undefined }[] = [];
export function sharingModule() {
  return {
    isAvailableAsync: async () => true,
    shareAsync: async (uri: string, options?: AnyRecord) => {
      shareCalls.push({ uri, options });
    },
  };
}

export function viewShotModule() {
  return {
    captureRef: async () => 'file:///tmp/klokka-card.png',
  };
}

export const localizationState = { languageCode: 'en' };
export function localizationModule() {
  return {
    getLocales: () => [
      {
        languageCode: localizationState.languageCode,
        languageTag: `${localizationState.languageCode}-SE`,
        regionCode: 'SE',
        textDirection: 'ltr',
      },
    ],
    useLocales: () => [
      {
        languageCode: localizationState.languageCode,
        languageTag: `${localizationState.languageCode}-SE`,
        regionCode: 'SE',
        textDirection: 'ltr',
      },
    ],
  };
}

export function networkModule() {
  return {
    addNetworkStateListener: () => ({ remove: () => undefined }),
    getNetworkStateAsync: async () => ({ isConnected: true, isInternetReachable: true }),
  };
}

export function webBrowserModule() {
  return {
    maybeCompleteAuthSession: () => ({ type: 'failed' }),
    openAuthSessionAsync: async () => ({ type: 'dismiss' }),
    openBrowserAsync: async () => ({ type: 'opened' }),
    WebBrowserResultType: { CANCEL: 'cancel', DISMISS: 'dismiss', OPENED: 'opened' },
  };
}

export function linearGradientModule() {
  const React = require('react') as typeof import('react');
  const { View } = require('react-native') as typeof import('react-native');
  return {
    LinearGradient: (props: AnyRecord & { children?: unknown }) =>
      React.createElement(View, { style: props.style as object }, props.children as React.ReactNode),
  };
}

// expo-router outside a navigator: a recording router and empty params, overridable per test.
export const routerState = {
  pushes: [] as unknown[],
  replaces: [] as unknown[],
  backs: 0,
  dismissAlls: 0,
  params: {} as Record<string, string>,
};
export function expoRouterModule() {
  const React = require('react') as typeof import('react');
  const router = {
    push: (href: unknown) => {
      routerState.pushes.push(href);
    },
    replace: (href: unknown) => {
      routerState.replaces.push(href);
    },
    back: () => {
      routerState.backs += 1;
    },
    navigate: (href: unknown) => {
      routerState.pushes.push(href);
    },
    canGoBack: () => true,
    canDismiss: () => true,
    dismissAll: () => {
      routerState.dismissAlls += 1;
    },
  };
  return {
    useRouter: () => router,
    router,
    useLocalSearchParams: () => routerState.params,
    useGlobalSearchParams: () => routerState.params,
    usePathname: () => '/',
    useSegments: () => [],
    useNavigation: () => ({ setOptions: () => undefined }),
    Redirect: ({ href }: { href: unknown }) => {
      routerState.replaces.push(href);
      return null;
    },
    Link: ({ children }: { children: unknown }) => children,
    Stack: () => null,
    Tabs: () => null,
    Slot: () => null,
    useFocusEffect: (effect: () => void | (() => void)) => React.useEffect(effect, [effect]),
  };
}

// "Use where I am now" (CHQ-156): permission granted and a fixed point on Hornsgatan, Stockholm.
export const locationState = { granted: true };
export function locationModule() {
  return {
    Accuracy: { Balanced: 3 },
    requestForegroundPermissionsAsync: async () => ({ status: locationState.granted ? 'granted' : 'denied' }),
    getCurrentPositionAsync: async () => ({ coords: { latitude: 59.31721, longitude: 18.06302 } }),
  };
}

let uuidCounter = 0;
export function cryptoModule() {
  return {
    randomUUID: () => `00000000-0000-4000-8000-${String(++uuidCounter).padStart(12, '0')}`,
  };
}

// expo-maps (CHQ-163): the native map is a View in tests. Each map keeps its last props in `mapsMock.last`, so a
// test can play a camera move (`mapsMock.last?.onCameraMove?.(...)`) and read where the picker flew it.
export const mapsMock: {
  last: { onCameraMove?: (event: { coordinates: { latitude?: number; longitude?: number } }) => void } | null;
  moves: { coordinates?: { latitude?: number; longitude?: number }; zoom?: number }[];
} = { last: null, moves: [] };

export function mapsModule() {
  const React = require('react') as typeof import('react');
  const { View } = require('react-native') as typeof import('react-native');
  const MapView = React.forwardRef(function MapView(props: AnyRecord, ref: React.Ref<unknown>) {
    mapsMock.last = props as typeof mapsMock.last;
    React.useImperativeHandle(ref, () => ({
      setCameraPosition: (to: (typeof mapsMock.moves)[number]) => mapsMock.moves.push(to),
    }));
    return React.createElement(View, { testID: 'native-map' });
  });
  const scheme = { LIGHT: 'LIGHT', DARK: 'DARK', FOLLOW_SYSTEM: 'FOLLOW_SYSTEM', AUTOMATIC: 'AUTOMATIC' };
  return {
    GoogleMaps: { View: MapView, MapColorScheme: scheme },
    AppleMaps: { View: MapView, MapColorScheme: scheme },
  };
}

// The library's own jest mock renders KeyboardAwareScrollView as a plain ScrollView, so a test could not tell a
// keyboard-aware body from one that ignores the keyboard; this one tags it.
export function keyboardAwareModule() {
  const React = require('react') as typeof import('react');
  const { ScrollView } = require('react-native') as typeof import('react-native');
  function KeyboardAwareScrollView(props: AnyRecord) {
    return React.createElement(ScrollView, { ...props, testID: 'keyboard-aware-scroll' });
  }
  return {
    ...jest.requireActual<AnyRecord>('react-native-keyboard-controller/jest'),
    KeyboardAwareScrollView,
  };
}
