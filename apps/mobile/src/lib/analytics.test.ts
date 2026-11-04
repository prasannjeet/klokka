import { ANALYTICS_HOSTNAME, umamiRequest, userAgent } from './analytics';

const target = { url: 'https://umami.example.se', websiteId: '33d7ba05-164a-41e3-8723-59ebbea29c31' };
const context = { userAgent: 'UA', language: 'sv', screen: '412x915' };

describe('umamiRequest', () => {
  it('posts a page view with the cleaned path to /api/send', () => {
    const { url, init } = umamiRequest(target, context, {
      kind: 'screen',
      path: '/day/0b6f9c1e-3a4d-4e5f-9a8b-7c6d5e4f3a2b/2026-11-04?step=next',
    });
    expect(url).toBe('https://umami.example.se/api/send');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json', 'User-Agent': 'UA' });
    expect(JSON.parse(init.body as string)).toEqual({
      type: 'event',
      payload: {
        website: target.websiteId,
        hostname: ANALYTICS_HOSTNAME,
        language: 'sv',
        screen: '412x915',
        url: '/day/:id/:date',
        title: '/day/:id/:date',
        referrer: '',
      },
    });
  });

  it('names the event on an event hit and nothing else about the user', () => {
    const { init } = umamiRequest(target, context, { kind: 'event', name: 'hours_saved', path: '/week' });
    const { payload } = JSON.parse(init.body as string);
    expect(payload.name).toBe('hours_saved');
    expect(Object.keys(payload).sort()).toEqual(
      ['hostname', 'language', 'name', 'referrer', 'screen', 'title', 'url', 'website'].sort(),
    );
  });
});

describe('userAgent', () => {
  it('reads as an Android or iOS phone and names the app', () => {
    expect(userAgent('android', '14', 'SM-F731B', '1.9.0')).toBe(
      'Mozilla/5.0 (Linux; Android 14; SM-F731B) Mobile Klokka/1.9.0',
    );
    expect(userAgent('ios', '18.1', 'iPhone', '1.9.0')).toBe(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) Mobile Klokka/1.9.0',
    );
  });
});
