import type {
  Entry,
  Flag,
  Me,
  Member,
  MemberInsights,
  MemberMonth,
  Notification,
  Workspace,
  WorkspaceInsights,
} from '@klokka/api-client';
import { fromIsoDate } from '@/lib/dates';

// Café Nord, the example workspace of the mockups: Nora Lind is the employer, Maria Lind the
// employee we follow, Jonas, Ayla and Sam the rest of the team. Dates are anchored on 2026-09-25.
export const WS = 'ws-cafe';
export const TODAY = '2026-09-25';
export const MONTH = '2026-09';

const d = (iso: string) => fromIsoDate(iso);
const at = (iso: string) => new Date(iso);
const nora = { userId: 'usr_nora', name: 'Nora Lind' };

export const workspaceFixture: Workspace = {
  id: WS,
  name: 'Café Nord',
  slug: 'cafe-nord',
  timezone: 'Europe/Stockholm',
  country: 'SE',
  currency: 'SEK',
  weekStart: 'MONDAY',
  colour: 'BLUE',
  emoji: '☕',
  showPay: true,
  rounding: 'HALF',
  defaultDayHours: 7.5,
  createdAt: at('2026-05-01T08:00:00Z'),
  memberCount: 5,
  activeMemberCount: 4,
  myRole: 'EMPLOYER',
  myMembershipId: 'mem-nora',
};

const base = {
  workspaceId: WS,
  role: 'EMPLOYEE' as const,
  invitedAt: at('2026-05-12T09:30:00Z'),
  lastEntryDate: d('2026-09-24'),
};

export const membersFixture: Member[] = [
  {
    ...base,
    id: 'mem-maria',
    userId: 'usr_maria',
    displayName: 'Maria Lind',
    email: 'maria.lind@example.com',
    avatarEmoji: null,
    status: 'ACTIVE',
    hourlyRate: 165,
    joinedAt: at('2026-05-13T10:00:00Z'),
    month: { month: MONTH, hours: 92.5, daysWorked: 21, earnings: 15263 },
  },
  {
    ...base,
    id: 'mem-jonas',
    userId: 'usr_jonas',
    displayName: 'Jonas Berg',
    email: 'jonas@example.com',
    avatarEmoji: null,
    status: 'ACTIVE',
    hourlyRate: 170,
    joinedAt: at('2026-05-13T10:00:00Z'),
    month: { month: MONTH, hours: 150, daysWorked: 20, earnings: 25500 },
  },
  {
    ...base,
    id: 'mem-ayla',
    userId: 'usr_ayla',
    displayName: 'Ayla Demir',
    email: 'ayla@example.com',
    avatarEmoji: null,
    status: 'ACTIVE',
    hourlyRate: 160,
    joinedAt: at('2026-09-22T10:00:00Z'),
    month: { month: MONTH, hours: 71, daysWorked: 12, earnings: 11360 },
  },
  {
    ...base,
    id: 'mem-sam',
    userId: null,
    displayName: 'Sam Ali',
    email: 'sam@example.com',
    avatarEmoji: null,
    status: 'INVITED',
    hourlyRate: 160,
    joinedAt: null,
    invitation: {
      status: 'PENDING',
      sentAt: at('2026-09-23T08:00:00Z'),
      expiresAt: at('2026-09-30T08:00:00Z'),
      resendCount: 0,
    },
    month: { month: MONTH, hours: 22, daysWorked: 4, earnings: 3520 },
  },
];

export function entryFixture(
  membershipId: string,
  date: string,
  hours: number,
  extra: Partial<Entry> = {},
): Entry {
  return {
    id: `entry-${membershipId}-${date}`,
    workspaceId: WS,
    membershipId,
    memberName: membersFixture.find((m) => m.id === membershipId)?.displayName ?? 'Someone',
    workDate: d(date),
    hours,
    note: null,
    earnings: hours * 165,
    locked: false,
    createdAt: at(`${date}T16:00:00Z`),
    createdBy: nora,
    updatedAt: at(`${date}T16:00:00Z`),
    updatedBy: nora,
    changeCount: 1,
    ...extra,
  };
}

export const entriesFixture: Entry[] = [
  entryFixture('mem-maria', '2026-09-24', 4),
  entryFixture('mem-maria', '2026-09-25', 4, { note: 'Counter' }),
  entryFixture('mem-jonas', '2026-09-24', 8, { note: 'Opening shift' }),
  entryFixture('mem-jonas', '2026-09-25', 8),
  entryFixture('mem-ayla', '2026-09-24', 5),
  entryFixture('mem-sam', '2026-09-24', 4),
];

export const memberMonthFixture: MemberMonth = {
  membershipId: 'mem-maria',
  workspaceId: WS,
  name: 'Maria Lind',
  month: MONTH,
  locked: false,
  currency: 'SEK',
  showPay: true,
  hourlyRate: 165,
  days: Array.from({ length: 30 }, (_, i) => {
    const day = i + 1;
    const iso = `2026-09-${String(day).padStart(2, '0')}`;
    const date = d(iso);
    const weekday = date.getDay();
    const workingDay = weekday !== 0 && weekday !== 6;
    const hours =
      day > 25
        ? null
        : weekday === 0
          ? null
          : weekday === 3
            ? 6.5
            : weekday === 6
              ? day === 5
                ? 7
                : day === 19
                  ? 5.5
                  : null
              : day === 17
                ? 2
                : 4;
    return {
      date,
      weekday: (['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const)[
        weekday
      ] as MemberMonth['days'][number]['weekday'],
      workingDay,
      entryId: hours ? `entry-mem-maria-${iso}` : null,
      hours,
      note: day === 23 ? 'Delivery day' : null,
      earnings: hours ? hours * 165 : null,
      ...(day === 17
        ? { flag: { id: 'flag-1', status: 'OPEN' as const, reason: 'MORE' as const, suggestedHours: 4 } }
        : {}),
      changeCount: hours ? (day === 23 ? 2 : 1) : 0,
      updatedAt: hours ? at(`${iso}T13:50:00Z`) : null,
      ...(hours ? { updatedBy: nora } : {}),
    };
  }),
  totalHours: 92.5,
  daysWorked: 21,
  workingDays: 22,
  avgPerWorkingDay: 4.6,
  lastMonthHours: 86.5,
  vsLastMonthHours: 6,
  bestWeek: { isoWeek: 37, from: d('2026-09-07'), to: d('2026-09-13'), hours: 25.5 },
  weeks: [],
  daysWithNote: 1,
  earnings: 15263,
  openFlags: 1,
};

export const memberInsightsFixture: MemberInsights = {
  membershipId: 'mem-maria',
  month: MONTH,
  asOf: at('2026-09-25T12:00:00Z'),
  currency: 'SEK',
  showPay: true,
  hourlyRate: 165,
  totalHours: 92.5,
  lastMonthHours: 86.5,
  vsLastMonthHours: 6,
  vsLastMonthPercent: 6.9,
  avgPerWorkingDay: 4.6,
  workingDays: 22,
  daysWorked: 21,
  bestWeek: { isoWeek: 37, from: d('2026-09-07'), to: d('2026-09-13'), hours: 25.5 },
  weekByWeek: [],
  streakDays: 5,
  earnings: 15263,
};

export const insightsFixture: WorkspaceInsights = {
  month: MONTH,
  asOf: at('2026-09-25T12:00:00Z'),
  timezone: 'Europe/Stockholm',
  currency: 'SEK',
  showPay: true,
  activeMembers: 4,
  totalHours: 335.5,
  lastMonthHoursAtSamePoint: 325.7,
  vsLastMonthAtSamePointHours: 9.8,
  vsLastMonthAtSamePointPercent: 3,
  lastMonthTotalHours: 386.5,
  projectedMonthEndHours: 402,
  projectedVsLastMonthPercent: 4,
  avgHoursPerPersonPerWorkingDay: 4.7,
  workingDays: 22,
  elapsedWorkingDays: 19,
  labourCost: 55423,
  perMember: [
    { membershipId: 'mem-maria', name: 'Maria Lind', hours: 92.5, sharePercent: 27.6, earnings: 15263 },
    { membershipId: 'mem-jonas', name: 'Jonas Berg', hours: 150, sharePercent: 44.7, earnings: 25500 },
    { membershipId: 'mem-ayla', name: 'Ayla Demir', hours: 71, sharePercent: 21.2, earnings: 11360 },
    { membershipId: 'mem-sam', name: 'Sam Ali', hours: 22, sharePercent: 6.5, earnings: 3520 },
  ],
  weekByWeek: [
    { isoWeek: 36, from: d('2026-08-31'), to: d('2026-09-06'), hours: 84 },
    { isoWeek: 37, from: d('2026-09-07'), to: d('2026-09-13'), hours: 90.5 },
    { isoWeek: 38, from: d('2026-09-14'), to: d('2026-09-20'), hours: 78 },
    { isoWeek: 39, from: d('2026-09-21'), to: d('2026-09-27'), hours: 83 },
  ],
  weekdayDistribution: [],
  busiestDay: { weekday: 'WEDNESDAY', avgHours: 22 },
  nothingLoggedDays: [{ date: d('2026-09-18') }],
  currentWeek: {
    isoWeek: 39,
    from: d('2026-09-21'),
    to: d('2026-09-27'),
    hours: 101,
    days: [
      { date: d('2026-09-21'), hours: 21 },
      { date: d('2026-09-22'), hours: 18.5 },
      { date: d('2026-09-23'), hours: 24 },
      { date: d('2026-09-24'), hours: 20.5 },
      { date: d('2026-09-25'), hours: 17 },
      { date: d('2026-09-26'), hours: 0 },
      { date: d('2026-09-27'), hours: 0 },
    ],
    membersLoggedToday: 3,
    membersActive: 4,
  },
  openFlags: 1,
};

export const flagFixture: Flag = {
  id: 'flag-1',
  workspaceId: WS,
  entryId: 'entry-mem-maria-2026-09-17',
  membershipId: 'mem-maria',
  memberName: 'Maria Lind',
  workDate: d('2026-09-17'),
  loggedHours: 2,
  suggestedHours: 4,
  reason: 'MORE',
  message: 'I worked 4 h, not 2. I stayed for the delivery after close.',
  status: 'OPEN',
  raisedAt: at('2026-09-25T05:15:00Z'),
  raisedBy: { userId: 'usr_maria', name: 'Maria Lind' },
};

export const notificationsFixture: Notification[] = [
  {
    id: 'n1',
    workspaceId: WS,
    workspaceName: 'Café Nord',
    workspaceEmoji: '☕',
    kind: 'HOURS_CHANGED',
    title: 'Nora added 5 days for you.',
    body: '22.5 h in week 39.',
    detail: 'Mon 21 to Fri 25 Sep',
    payload: {},
    link: { workspaceId: WS, membershipId: 'mem-maria', month: MONTH },
    readAt: null,
    createdAt: at('2026-09-25T11:50:00Z'),
  },
  {
    id: 'n2',
    workspaceId: WS,
    workspaceName: 'Café Nord',
    workspaceEmoji: '☕',
    kind: 'MONTH_CLOSED',
    title: 'August is closed.',
    body: '96 h, 15,840 kr.',
    detail: null,
    payload: {},
    link: { workspaceId: WS, membershipId: 'mem-maria', month: '2026-08' },
    readAt: at('2026-09-02T08:00:00Z'),
    createdAt: at('2026-09-01T08:00:00Z'),
  },
];

export const employerMeFixture: Me = {
  user: {
    id: 'usr_nora',
    email: 'nora@example.com',
    name: 'Nora Lind',
    avatarEmoji: null,
    createdAt: at('2026-05-01T08:00:00Z'),
  },
  preferences: { language: 'en', pushEnabled: true, digestEnabled: false, theme: 'SYSTEM' },
  workspaces: [
    {
      workspaceId: WS,
      membershipId: 'mem-nora',
      name: 'Café Nord',
      slug: 'cafe-nord',
      colour: 'BLUE',
      emoji: '☕',
      role: 'EMPLOYER',
      memberStatus: 'ACTIVE',
      showPay: true,
      currency: 'SEK',
      timezone: 'Europe/Stockholm',
      weekStart: 'MONDAY',
      rounding: 'NONE',
      defaultDayHours: 8,
      memberCount: 4,
      employerName: 'Nora Lind',
      hoursThisMonth: 335.5,
      unreadNotifications: 1,
    },
  ],
  platformAdmin: false,
  pushTokenRegistered: true,
};
