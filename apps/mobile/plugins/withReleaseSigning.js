/* eslint-disable @typescript-eslint/no-require-imports */
/* global require, module */
// Expo's template signs the `release` variant with the DEBUG keystore (docs/research/mobile.md, brief
// correction 6). This config plugin points the release signing config at the project keystore when
// the four values are present, either as environment variables (KLOKKA_RELEASE_STORE_FILE /
// _STORE_PASSWORD / _KEY_ALIAS / _KEY_PASSWORD) or as the same-named Gradle properties in
// ~/.gradle/gradle.properties (a local signed build). When none is set the debug key stays, so a local
// `assembleRelease` still produces an installable, throwaway-signed APK. CI takes the other road:
// .github/workflows/ci.yml passes the standard android.injected.signing.* properties (which override any
// signing config) and then verifies the APK's certificate against the keystore, so a debug-signed APK is
// never published.
const { withAppBuildGradle } = require('expo/config-plugins');

const PROPS = [
  'KLOKKA_RELEASE_STORE_FILE',
  'KLOKKA_RELEASE_STORE_PASSWORD',
  'KLOKKA_RELEASE_KEY_ALIAS',
  'KLOKKA_RELEASE_KEY_PASSWORD',
];

const RELEASE_SIGNING = `
        release {
            if (project.hasProperty('KLOKKA_RELEASE_STORE_FILE') || System.getenv('KLOKKA_RELEASE_STORE_FILE')) {
                def prop = { name -> project.hasProperty(name) ? project.property(name) : System.getenv(name) }
                storeFile file(prop('KLOKKA_RELEASE_STORE_FILE'))
                storePassword prop('KLOKKA_RELEASE_STORE_PASSWORD')
                keyAlias prop('KLOKKA_RELEASE_KEY_ALIAS')
                keyPassword prop('KLOKKA_RELEASE_KEY_PASSWORD')
            }
        }`;

function withReleaseSigning(config) {
  return withAppBuildGradle(config, (mod) => {
    let contents = mod.modResults.contents;
    if (contents.includes('KLOKKA_RELEASE_STORE_FILE')) return mod;
    // 1. Add a release signing config next to the template's debug one.
    contents = contents.replace(
      /signingConfigs \{\s*debug \{[\s\S]*?\n {8}\}/,
      (debugBlock) => `${debugBlock}${RELEASE_SIGNING}`,
    );
    // 2. Make the release build type use it when the keystore is configured; the debug key otherwise.
    contents = contents.replace(
      /(buildTypes \{[\s\S]*?release \{[\s\S]*?)signingConfig signingConfigs\.debug/,
      (_m, head) =>
        `${head}signingConfig((project.hasProperty('KLOKKA_RELEASE_STORE_FILE') || System.getenv('KLOKKA_RELEASE_STORE_FILE')) ? signingConfigs.release : signingConfigs.debug)`,
    );
    mod.modResults.contents = contents;
    return mod;
  });
}

module.exports = withReleaseSigning;
module.exports.RELEASE_SIGNING_PROPERTIES = PROPS;
