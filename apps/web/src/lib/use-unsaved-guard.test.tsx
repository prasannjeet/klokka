import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from './i18n';
import { useUnsavedGuard } from './use-unsaved-guard';

const push = vi.fn();
const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace }) }));

beforeAll(() => {
  // jsdom has no modal dialogs.
  HTMLDialogElement.prototype.showModal = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
});

function Page({ initiallyDirty = false }: { initiallyDirty?: boolean }) {
  const [dirty, setDirty] = useState(initiallyDirty);
  const guard = useUnsavedGuard(dirty);
  return (
    <>
      <a href="/w/kafe-nord/week">Week</a>
      <a href="https://example.com/">Elsewhere</a>
      <button type="button" onClick={() => setDirty(!dirty)}>
        Toggle
      </button>
      <button type="button" onClick={() => guard.requestLeave('/w/kafe-nord/month')}>
        Cancel
      </button>
      <button type="button" onClick={() => guard.leaveNow('/w/kafe-nord/day')}>
        Saved
      </button>
      {guard.dialog}
    </>
  );
}

function renderPage(initiallyDirty = false) {
  return render(
    <LocaleProvider initial="en">
      <Page initiallyDirty={initiallyDirty} />
    </LocaleProvider>,
  );
}

// A click as the browser dispatches it; `false` from dispatchEvent means something prevented the navigation.
function clickLink(name: string): boolean {
  let followed = false;
  act(() => {
    followed = screen
      .getByRole('link', { name })
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
  });
  return followed;
}

// The dialog's buttons (jsdom never opens the <dialog>, so they count as hidden).
const dialogButton = (name: string) => screen.getByRole('button', { name, hidden: true });

describe('useUnsavedGuard', () => {
  beforeEach(() => {
    push.mockReset();
    replace.mockReset();
    window.history.replaceState(null, '', '/w/kafe-nord/jobs/new');
  });
  afterEach(() => vi.restoreAllMocks());

  it('lets a clean page leave without asking', () => {
    renderPage();
    expect(clickLink('Week')).toBe(true);
    expect(screen.queryByText('Discard changes?')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(push).toHaveBeenCalledWith('/w/kafe-nord/month');
  });

  it('asks before following a link with changes; Keep editing stays, Discard follows it', () => {
    renderPage(true);
    expect(clickLink('Week')).toBe(false);
    expect(screen.getByText('Discard changes?')).toBeTruthy();
    expect(screen.getByText('What you entered for this job will be lost.')).toBeTruthy();
    fireEvent.click(dialogButton('Keep editing'));
    expect(screen.queryByText('Discard changes?')).toBeNull();
    expect(push).not.toHaveBeenCalled();

    clickLink('Week');
    fireEvent.click(dialogButton('Discard'));
    // Replaces the extra history entry the guard pushed, so Back from the next page is one step, not two.
    expect(replace).toHaveBeenCalledWith('/w/kafe-nord/week');
    expect(push).not.toHaveBeenCalled();
  });

  it('leaves links to other sites and modified clicks to the browser', () => {
    renderPage(true);
    expect(clickLink('Elsewhere')).toBe(true);
    const ctrl = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ctrlKey: true });
    screen.getByRole('link', { name: 'Week' }).addEventListener('click', (e) => e.preventDefault());
    screen.getByRole('link', { name: 'Week' }).dispatchEvent(ctrl);
    expect(screen.queryByText('Discard changes?')).toBeNull();
  });

  it('asks on Cancel with changes', () => {
    renderPage(true);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByText('Discard changes?')).toBeTruthy();
    fireEvent.click(dialogButton('Discard'));
    expect(replace).toHaveBeenCalledWith('/w/kafe-nord/month');
    expect(push).not.toHaveBeenCalled();
  });

  it('leaves without asking through leaveNow, replacing the extra entry once one was pushed', () => {
    renderPage(true);
    fireEvent.click(screen.getByRole('button', { name: 'Saved' }));
    expect(screen.queryByText('Discard changes?')).toBeNull();
    expect(replace).toHaveBeenCalledWith('/w/kafe-nord/day');
    expect(push).not.toHaveBeenCalled();
  });

  it('catches the browser Back with one extra history entry and leaves past it on Discard', () => {
    const pushState = vi.spyOn(window.history, 'pushState');
    const go = vi.spyOn(window.history, 'go').mockImplementation(() => {});
    renderPage(true);
    expect(pushState).toHaveBeenCalledTimes(1);
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(pushState).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Discard changes?')).toBeTruthy();
    fireEvent.click(dialogButton('Discard'));
    expect(go).toHaveBeenCalledWith(-2);
    expect(push).not.toHaveBeenCalled();
  });

  it('prompts on reload with changes, and removes every listener once clean', () => {
    renderPage(true);
    const unload = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Toggle' }));
    const later = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(later);
    expect(later.defaultPrevented).toBe(false);
    expect(clickLink('Week')).toBe(true);
    expect(screen.queryByText('Discard changes?')).toBeNull();
  });
});
