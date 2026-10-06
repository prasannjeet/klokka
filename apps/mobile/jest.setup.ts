/* eslint-disable @typescript-eslint/no-require-imports */
// Native modules that jest-expo cannot run. Registered here rather than per suite so a screen that
// merely CONTAINS one of them keeps rendering, and every suite reads the same fakes
// (src/testing/nativeMocks.ts). Requires stay lazy inside the factories so nothing native is pulled
// in while this setup file is evaluated.

require('react-native-gesture-handler/jestSetup');

jest.mock('react-native-keyboard-controller', () => require('react-native-keyboard-controller/jest'));
jest.mock('@expo/ui/community/bottom-sheet', () => require('./src/testing/nativeMocks').bottomSheetModule());
jest.mock('expo-haptics', () => require('./src/testing/nativeMocks').hapticsModule());
jest.mock('expo-secure-store', () => require('./src/testing/nativeMocks').secureStoreModule());
jest.mock('expo-notifications', () => require('./src/testing/nativeMocks').notificationsModule());
jest.mock('expo-sharing', () => require('./src/testing/nativeMocks').sharingModule());
jest.mock('react-native-view-shot', () => require('./src/testing/nativeMocks').viewShotModule());
jest.mock('expo-localization', () => require('./src/testing/nativeMocks').localizationModule());
jest.mock('expo-location', () => require('./src/testing/nativeMocks').locationModule());
jest.mock('expo-maps', () => require('./src/testing/nativeMocks').mapsModule());
jest.mock('expo-crypto', () => require('./src/testing/nativeMocks').cryptoModule());
jest.mock('expo-device', () => require('./src/testing/nativeMocks').deviceModule());
jest.mock('expo-network', () => require('./src/testing/nativeMocks').networkModule());
jest.mock('expo-web-browser', () => require('./src/testing/nativeMocks').webBrowserModule());
jest.mock('expo-linear-gradient', () => require('./src/testing/nativeMocks').linearGradientModule());
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// A stable environment for src/config.ts: the values a Metro run inlines.
process.env.EXPO_PUBLIC_API_BASE_URL = 'http://api.test/v1';
process.env.EXPO_PUBLIC_LOGTO_ENDPOINT = 'https://logto.test';
process.env.EXPO_PUBLIC_LOGTO_APP_ID = 'test-client';
process.env.EXPO_PUBLIC_LOGTO_API_RESOURCE = 'https://api.klokka.app';
jest.mock('expo-router', () => require('./src/testing/nativeMocks').expoRouterModule());
jest.mock('expo-file-system', () => ({
  Paths: { cache: 'file:///cache/' },
  File: class {
    uri: string;
    constructor(dir: string, name: string) {
      this.uri = `${dir}${name}`;
    }
    write() {
      return undefined;
    }
  },
}));
jest.mock('expo-system-ui', () => ({ setBackgroundColorAsync: async () => undefined }));
