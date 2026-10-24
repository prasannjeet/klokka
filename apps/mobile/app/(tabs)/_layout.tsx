import { Redirect, Tabs, useSegments } from 'expo-router';
import { Platform, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useActiveWorkspace } from '@/data/me';
import { useT } from '@/i18n/LocaleProvider';
import { useTheme } from '@/theme';
import { Icon, type IconName } from '@/ui';
import { TabButton } from '@/ui/TabButton';

// Bottom tabs: the employer gets Home, People, Calendar, Settings (CHQ-171); the employee gets Month, Week,
// Notifications, Profile. One layout, the tabs that do not belong to the role are hidden. Insights left the
// bar for a page Home opens (app/insights.tsx).
const ROLE_TABS = {
  EMPLOYER: ['home', 'people', 'calendar', 'settings'],
  EMPLOYEE: ['month', 'week', 'notifications', 'profile'],
} as const;

export default function TabsLayout() {
  const t = useT();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { workspace, me } = useActiveWorkspace();
  const segments = useSegments() as string[];
  if (me && !workspace) return <Redirect href="/" />;
  const employer = workspace?.role === 'EMPLOYER';
  // Expo Router keeps the open tab while AuthGate shows sign-in, so signing out and in as the other role
  // (without restarting) would land on a tab of the previous role (CHQ-190): send it to this role's first tab.
  const openTab = segments[0] === '(tabs)' ? segments[1] : undefined;
  if (workspace && openTab) {
    const tabs: readonly string[] = ROLE_TABS[workspace.role];
    if (!tabs.includes(openTab)) return <Redirect href={employer ? '/(tabs)/home' : '/(tabs)/month'} />;
  }
  const icon =
    (name: IconName) =>
    ({ color }: { color: ColorValue }) => <Icon name={name} size={24} color={String(color)} />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // The selected tab: full text colour plus TabButton's primary bar on the top edge, as on the web (CHQ-167).
        tabBarActiveTintColor: theme.color.text,
        tabBarInactiveTintColor: theme.color.textMuted,
        tabBarStyle: {
          backgroundColor: theme.color.surface,
          borderTopColor: theme.color.border,
          borderTopWidth: 1,
          // A numeric height replaces the navigator's own "bar + inset" sum, while it still pads the
          // bar by the inset: without adding it here the system navigation eats the icons and labels.
          height: (Platform.OS === 'ios' ? 50 : 68) + insets.bottom,
          paddingTop: theme.space[2],
        },
        tabBarButton: (props) => <TabButton {...props} />,
        tabBarLabelStyle: { ...theme.text('caption', 600), marginTop: 2 },
        sceneStyle: { backgroundColor: theme.color.bg },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ title: t('nav.home'), tabBarIcon: icon('home'), href: employer ? undefined : null }}
      />
      <Tabs.Screen
        name="month"
        options={{ title: t('nav.month'), tabBarIcon: icon('calendar'), href: employer ? null : undefined }}
      />
      <Tabs.Screen
        name="people"
        options={{ title: t('nav.people'), tabBarIcon: icon('users'), href: employer ? undefined : null }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: t('nav.calendar'),
          tabBarIcon: icon('calendar'),
          href: employer ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="week"
        options={{ title: t('nav.week'), tabBarIcon: icon('clock'), href: employer ? null : undefined }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: t('nav.notifications'),
          tabBarIcon: icon('bell'),
          href: employer ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: t('nav.settings'), tabBarIcon: icon('sliders'), href: employer ? undefined : null }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t('nav.profile'), tabBarIcon: icon('user'), href: employer ? null : undefined }}
      />
    </Tabs>
  );
}
