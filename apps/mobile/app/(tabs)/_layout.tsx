import { Tabs } from 'expo-router';
import { Platform, type ColorValue } from 'react-native';
import { useT } from '@/i18n/LocaleProvider';
import { useTheme } from '@/theme';
import { Icon, type IconName } from '@/ui';

// Bottom tabs per the mockup. The role-based split (employer: Home, Week, Insights, Settings;
// employee: Month, Week, Notifications, Profile) arrives with sign-in and /me.
export default function TabsLayout() {
  const t = useT();
  const theme = useTheme();
  const icon =
    (name: IconName) =>
    ({ color }: { color: ColorValue }) => <Icon name={name} size={24} color={String(color)} />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.color.primary,
        tabBarInactiveTintColor: theme.color.textMuted,
        tabBarStyle: {
          backgroundColor: theme.color.surface,
          borderTopColor: theme.color.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 84 : 68,
          paddingTop: theme.space[2],
        },
        tabBarLabelStyle: { ...theme.text('caption', 600), marginTop: 2 },
        sceneStyle: { backgroundColor: theme.color.bg },
      }}
    >
      <Tabs.Screen name="home" options={{ title: t('nav.home'), tabBarIcon: icon('home') }} />
      <Tabs.Screen name="month" options={{ title: t('nav.month'), tabBarIcon: icon('calendar') }} />
      <Tabs.Screen name="week" options={{ title: t('nav.week'), tabBarIcon: icon('clock') }} />
      <Tabs.Screen name="insights" options={{ title: t('nav.insights'), tabBarIcon: icon('bar-chart') }} />
      <Tabs.Screen name="notifications" options={{ title: t('nav.notifications'), tabBarIcon: icon('bell') }} />
      <Tabs.Screen name="settings" options={{ title: t('nav.settings'), tabBarIcon: icon('sliders') }} />
      <Tabs.Screen name="profile" options={{ title: t('nav.profile'), tabBarIcon: icon('user') }} />
    </Tabs>
  );
}
