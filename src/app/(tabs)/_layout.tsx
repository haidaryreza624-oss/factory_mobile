import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { Platform } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Icons } from '@/constants/icons';
import { fa } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/providers/app-provider';

export default function TabsLayout() {
  const { factory } = useApp();
  const theme = useTheme();
  const tabIconColor = (color: unknown) =>
    typeof color === 'string' ? color : theme.textSecondary;

  if (!factory) {
    return <Redirect href="/setup" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          ...(Platform.OS === 'web' ? {} : { direction: 'rtl' as const }),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          writingDirection: 'rtl',
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
        tabBarHideOnKeyboard: true,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: fa.tabs.dashboard,
          tabBarIcon: ({ color, size }) => (
            <Icon name={Icons.dashboard} size={size} color={tabIconColor(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: fa.tabs.inventory,
          tabBarIcon: ({ color, size }) => (
            <Icon name={Icons.inventory} size={size} color={tabIconColor(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="operations"
        options={{
          title: fa.tabs.operations,
          tabBarIcon: ({ color, size }) => (
            <Icon name={Icons.operations} size={size} color={tabIconColor(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="finance"
        options={{
          title: fa.tabs.finance,
          tabBarIcon: ({ color, size }) => (
            <Icon name={Icons.finance} size={size} color={tabIconColor(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: fa.tabs.more,
          tabBarIcon: ({ color, size }) => (
            <Icon name={Icons.more} size={size} color={tabIconColor(color)} />
          ),
        }}
      />
    </Tabs>
  );
}
