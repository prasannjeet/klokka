import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tokens } from '@klokka/tokens';
import { resolveAppConfig, AppConfigError } from './config';

// app.config.ts cannot import workspace TypeScript (Expo's config loader compiles it alone), so its
// colour literals are pinned here against @klokka/tokens, and the fixed identity values against the
// decisions (docs/DECISIONS.md D19, docs/INFRA.md).
describe('app.config.ts', () => {
  const source = readFileSync(join(__dirname, '..', 'app.config.ts'), 'utf8');

  it('pins the splash and icon colours to the Nightshift tokens', () => {
    expect(source).toContain(`const NIGHT = '${tokens.color.dark.bg}'`);
    expect(source).toContain(`const LAVENDER = '${tokens.color.light.bg}'`);
    expect(source).toContain(`const MAGENTA = '${tokens.color.dark.primary}'`);
  });

  it('keeps the package id, scheme, slug and owner fixed', () => {
    expect(source).toContain("package: 'se.klokka.app'");
    expect(source).toContain("bundleIdentifier: 'se.klokka.app'");
    expect(source).toContain("scheme: 'klokka'");
    expect(source).toContain("slug: 'klokka'");
    expect(source).toContain("owner: 'prasannjeet'");
  });

  it('keeps permissions nothing uses out of the release manifest', () => {
    for (const permission of [
      'SYSTEM_ALERT_WINDOW',
      'READ_EXTERNAL_STORAGE',
      'WRITE_EXTERNAL_STORAGE',
      'USE_BIOMETRIC',
    ]) {
      expect(source).toContain(`'android.permission.${permission}'`);
    }
  });

  it('embeds the two families the tokens name, through the expo-font plugin', () => {
    expect(source).toContain(`fontFamily: '${tokens.font.display}'`);
    expect(source).toContain(`fontFamily: '${tokens.font.body}'`);
    expect(source).not.toContain('expo-dev-client');
  });
});

describe('resolveAppConfig', () => {
  const raw = {
    EXPO_PUBLIC_API_BASE_URL: 'https://klokka-api.coolify.ooguy.com/v1/',
    EXPO_PUBLIC_LOGTO_ENDPOINT: 'https://klokka-logto.coolify.ooguy.com',
    EXPO_PUBLIC_LOGTO_APP_ID: '1uhtt4uj8f0aevtgf6g3b',
    EXPO_PUBLIC_LOGTO_API_RESOURCE: 'https://api.klokka.app',
  };

  it('derives the issuer from the endpoint and trims trailing slashes', () => {
    expect(resolveAppConfig(raw)).toEqual({
      apiBaseUrl: 'https://klokka-api.coolify.ooguy.com/v1',
      logtoEndpoint: 'https://klokka-logto.coolify.ooguy.com',
      issuer: 'https://klokka-logto.coolify.ooguy.com/oidc',
      clientId: '1uhtt4uj8f0aevtgf6g3b',
      apiResource: 'https://api.klokka.app',
    });
  });

  it('names the missing variable instead of defaulting', () => {
    expect(() => resolveAppConfig({ ...raw, EXPO_PUBLIC_LOGTO_APP_ID: '' })).toThrow(AppConfigError);
    expect(() => resolveAppConfig({ ...raw, EXPO_PUBLIC_LOGTO_APP_ID: undefined })).toThrow(
      /EXPO_PUBLIC_LOGTO_APP_ID/,
    );
  });

  it('rejects a base URL that is not http(s)', () => {
    expect(() => resolveAppConfig({ ...raw, EXPO_PUBLIC_API_BASE_URL: '192.168.0.16:4011' })).toThrow(
      /http\(s\) URL/,
    );
  });
});
