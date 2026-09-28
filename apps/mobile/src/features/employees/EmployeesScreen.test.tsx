import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { EmployeesScreen } from './EmployeesScreen';
import { parseRate } from './AddEmployeeSheet';
import { fakeApi, renderApp } from '@/testing/render';
import { employerMeFixture, membersFixture } from '@/testing/fixtures';
import { useAppStore } from '@/store/appStore';

describe('EmployeesScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-09-25T10:00:00Z') });
    useAppStore.getState().setActiveWorkspace('ws-cafe');
  });
  afterEach(() => jest.useRealTimers());

  it('lists rates (pay is on), the invited state with a resend, and month totals', async () => {
    const api = fakeApi({
      getMe: employerMeFixture,
      listMembers: membersFixture,
      resendInvitation: membersFixture[3],
    });
    await renderApp(<EmployeesScreen />, { api });
    expect(await screen.findByText('Maria Lind')).toBeTruthy();
    expect(screen.getByText(/165.*\/h, joined 13 May/)).toBeTruthy();
    expect(screen.getByText('92.5')).toBeTruthy();
    expect(screen.getByText('Invited')).toBeTruthy();
    expect(screen.getByText('Invitation sent 23 Sept.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Resend'));
    await waitFor(() => expect(api.calls.some((c) => c.op === 'resendInvitation')).toBe(true));
    expect(await screen.findByText('Invitation sent again to sam@example.com.')).toBeTruthy();
  });

  it('sends an invitation with name, email and rate from the sheet', async () => {
    const api = fakeApi({
      getMe: employerMeFixture,
      listMembers: membersFixture,
      inviteMember: { ...membersFixture[3], displayName: 'Lina Ahmed' },
    });
    await renderApp(<EmployeesScreen />, { api });
    await screen.findByText('Maria Lind');
    await fireEvent.press(screen.getByTestId('add-employee'));
    expect((await screen.findAllByText('Add employee')).length).toBe(2);
    await fireEvent.changeText(screen.getByTestId('employee-name'), 'Lina Ahmed');
    await fireEvent.changeText(screen.getByTestId('employee-email'), 'Lina@Example.com');
    await fireEvent.changeText(screen.getByTestId('employee-rate'), '160');
    await fireEvent.press(screen.getByTestId('employee-submit'));
    await waitFor(() => expect(api.calls.some((c) => c.op === 'inviteMember')).toBe(true));
    const call = api.calls.find((c) => c.op === 'inviteMember')?.args[0] as { memberInvite: unknown };
    expect(call.memberInvite).toEqual({ name: 'Lina Ahmed', email: 'lina@example.com', hourlyRate: 160 });
  });
});

describe('parseRate', () => {
  it('accepts a comma decimal and rejects nonsense', () => {
    expect(parseRate('170')).toBe(170);
    expect(parseRate('165,5')).toBe(165.5);
    expect(parseRate('')).toBeNull();
    expect(parseRate('abc')).toBeNull();
    expect(parseRate('-5')).toBeNull();
  });
});
