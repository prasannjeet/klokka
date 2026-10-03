import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { ExpoConfig } from 'expo/config';

// Klokka's Expo config. `expo prebuild` generates android/ (and ios/) from this file, so neither is
// hand-edited or committed (docs/research/mobile.md section 1). Nothing environment-dependent lives
// here: the API URL, the Logto issuer, the client id and the API resource are `EXPO_PUBLIC_*`
// variables inlined by Metro at bundle time (src/config.ts), so a JS reload picks up a change and a
// release bakes the values of the process that bundled it.
//
// The colours below are LITERALS on purpose: Expo's config loader compiles only this file and
// cannot follow a relative import into packages/tokens. src/appConfig.test.ts pins them against
// @klokka/tokens so a token change that forgets this file fails the build.
const NIGHT = '#0D0620';
const LAVENDER = '#F5F1FF';
const MAGENTA = '#FF006E';

// The EAS project id (docs/DECISIONS.md D5) is required by getExpoPushTokenAsync even for a locally
// built APK. It is read from the environment (`apps/mobile/.env`, gitignored; `EAS_PROJECT_ID` on
// the runners) rather than committed, per D12.
const easProjectId = process.env.EAS_PROJECT_ID ?? process.env.EXPO_PUBLIC_EAS_PROJECT_ID;

// google-services.json is copied from .agents/local-credentials/ at build time (gitignored). Without
// it FCM registration fails at runtime, but prebuild must still work on a machine without the file.
const googleServicesFile = join(__dirname, 'google-services.json');

const inter = (weight: string) => `../../node_modules/@expo-google-fonts/inter/${weight}/Inter_${weight}.ttf`;
const unbounded = (weight: string) =>
  `../../node_modules/@expo-google-fonts/unbounded/${weight}/Unbounded_${weight}.ttf`;

const config: ExpoConfig = {
  name: 'Klokka',
  slug: 'klokka',
  owner: 'prasannjeet',
  version: '1.1.3',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'klokka',
  userInterfaceStyle: 'automatic',
  backgroundColor: NIGHT,
  android: {
    // Fixed forever (docs/DECISIONS.md D12); matches the Firebase Android app.
    package: 'com.prasannjeet.klokka',
    versionCode: 8,
    adaptiveIcon: {
      backgroundColor: NIGHT,
      foregroundImage: './assets/adaptive-icon-foreground.png',
      monochromeImage: './assets/adaptive-icon-monochrome.png',
    },
    ...(existsSync(googleServicesFile) ? { googleServicesFile: './google-services.json' } : {}),
    // The persisted query cache and the secure-store blobs must never reach a Google Drive backup.
    allowBackup: false,
    predictiveBackGestureEnabled: false,
    // ADJUST_RESIZE: the IME becomes an inset the app consumes (react-native-keyboard-controller).
    softwareKeyboardLayoutMode: 'resize',
  },
  ios: {
    // Not built yet (no Apple account); the identity is reserved so the door stays open.
    supportsTablet: false,
    bundleIdentifier: 'com.prasannjeet.klokka',
    infoPlist: { UIBackgroundModes: ['remote-notification'] },
  },
  plugins: [
    'expo-router',
    [
      'expo-font',
      {
        android: {
          fonts: [
            {
              fontFamily: 'Unbounded',
              fontDefinitions: [
                { path: unbounded('700Bold'), weight: 700 },
                { path: unbounded('800ExtraBold'), weight: 800 },
              ],
            },
            {
              fontFamily: 'Inter',
              fontDefinitions: [
                { path: inter('400Regular'), weight: 400 },
                { path: inter('500Medium'), weight: 500 },
                { path: inter('600SemiBold'), weight: 600 },
                { path: inter('700Bold'), weight: 700 },
              ],
            },
          ],
        },
        ios: {
          fonts: [
            unbounded('700Bold'),
            unbounded('800ExtraBold'),
            inter('400Regular'),
            inter('500Medium'),
            inter('600SemiBold'),
            inter('700Bold'),
          ],
        },
      },
    ],
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 160,
        resizeMode: 'contain',
        backgroundColor: LAVENDER,
        dark: { image: './assets/splash-icon.png', backgroundColor: NIGHT },
      },
    ],
    // expo-web-browser declares the Android 11+ package-visibility queries the Custom Tab needs and
    // expo-secure-store registers the Keystore-backed store: without them the OIDC flow cannot run.
    'expo-web-browser',
    'expo-secure-store',
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: MAGENTA,
        defaultChannel: 'workspace',
      },
    ],
    'expo-localization',
    'expo-sharing',
    'expo-image',
    './plugins/withReleaseSigning.js',
  ],
  extra: {
    ...(easProjectId ? { eas: { projectId: easProjectId } } : {}),
  },
  experiments: {
    typedRoutes: true,
  },
};

export default config;
