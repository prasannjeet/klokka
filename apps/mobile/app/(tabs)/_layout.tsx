import { Redirect, Tabs } from 'expo-router';
import { Platform, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useActiveWorkspace } from '@/data/me';
import { useT } from '@/i18n/LocaleProvider';
import { useTheme } from '@/theme';
import { Icon, type IconName } from '@/ui';
import { TabButton } from '@/ui/TabButton';

// Bottom tabs per the mockup: the employer gets Home, Week, Insights, Settings; the employee gets
// Month, Week, Notifications, Profile. One layout, the tabs that do not belong to the role are hidden.
export default function TabsLayout() {
  const t = useT();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { workspace, me } = useActiveWorkspace();
  if (me && !workspace) return <Redirect href="/" />;
  const employer = workspace?.role === 'EMPLOYER';
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
      <Tabs.Screen name="week" options={{ title: t('nav.week'), tabBarIcon: icon('clock') }} />
      <Tabs.Screen
        name="insights"
        options={{
          title: t('nav.insights'),
          tabBarIcon: icon('bar-chart'),
          href: employer ? undefined : null,
        }}
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
