import { describe, expect, it } from 'vitest';
import { cleanPayload } from './analytics';

describe('cleanPayload', () => {
  const props = { website: 'w', hostname: 'app.klokka.se', language: 'sv', screen: '1440x900' };

  it('reports the cleaned path, never the slug, ids or query', () => {
    const payload = cleanPayload(props, '/w/cafe-nord/jobs/0b6f9c1e-3a4d-4e5f-9a8b-7c6d5e4f3a2b', '');
    expect(payload).toEqual({
      ...props,
      url: '/w/:workspace/jobs/:id',
      title: '/w/:workspace/jobs/:id',
      referrer: '',
    });
  });

  it('cuts the referrer to its origin, so a sign-in callback query never leaves the page', () => {
    const payload = cleanPayload(props, '/', 'https://auth.klokka.se/oidc/auth?state=abc&code=xyz');
    expect(payload.referrer).toBe('https://auth.klokka.se');
    expect(cleanPayload(props, '/', 'not a url').referrer).toBe('');
  });

  it('names an event hit', () => {
    expect(cleanPayload(props, '/w/cafe-nord/week', '', 'hours_saved')).toMatchObject({
      name: 'hours_saved',
      url: '/w/:workspace/week',
    });
  });
});
