import { jobEditorHref, parseJobEditorParams } from './jobEditorHref';

describe('the job editor route (CHQ-185)', () => {
  it('builds the href and reads it back', () => {
    expect(
      jobEditorHref({ membershipId: 'mem-1', date: '2026-10-07', mode: 'edit', jobId: 'job-1' }),
    ).toEqual({
      pathname: '/job',
      params: { membershipId: 'mem-1', date: '2026-10-07', mode: 'edit', jobId: 'job-1' },
    });
    expect(parseJobEditorParams({ membershipId: 'mem-1', date: '2026-10-07', mode: 'single' })).toEqual({
      membershipId: 'mem-1',
      date: '2026-10-07',
      mode: 'single',
    });
  });

  it('refuses missing or malformed params', () => {
    const ok = { membershipId: 'mem-1', date: '2026-10-07', mode: 'full' };
    expect(parseJobEditorParams({ ...ok, membershipId: '' })).toBeNull();
    expect(parseJobEditorParams({ ...ok, date: '2026-02-30' })).toBeNull();
    expect(parseJobEditorParams({ ...ok, date: '7 Oct' })).toBeNull();
    expect(parseJobEditorParams({ ...ok, mode: 'other' })).toBeNull();
    expect(parseJobEditorParams({ ...ok, mode: 'edit' })).toBeNull();
    expect(parseJobEditorParams({ ...ok, jobId: 'job-1' })).toBeNull();
    expect(parseJobEditorParams({ ...ok, date: ['2026-10-07', '2026-10-08'] })).toBeNull();
  });
});
