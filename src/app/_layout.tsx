import {
  DarkTheme,
  DefaultTheme,
  LocaleProvider,
  Stack,
  ThemeProvider,
  router,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { AppProvider } from '@/providers/app-provider';
import { DatabaseProvider } from '@/providers/database-provider';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const scheme = useColorScheme();
  const palette = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;

  const navigationTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: palette.primary,
      background: palette.background,
      card: palette.surface,
      text: palette.text,
      border: palette.border,
      notification: palette.danger,
    },
  };

  return (
    <ThemeProvider value={navigationTheme}>
      <LocaleProvider direction="rtl">
        <DatabaseProvider>
          <AppProvider>
            <AppNavigation backgroundColor={palette.background} />
          </AppProvider>
        </DatabaseProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}

function AppNavigation({ backgroundColor }: { backgroundColor: string }) {
  const handledNotificationId = useRef<string | null>(null);

  useEffect(() => {
    const handleResponse = (response: Notifications.NotificationResponse) => {
      const request = response.notification.request;
      if (handledNotificationId.current === request.identifier) return;

      const destination = request.content.data?.url;
      console.info('[notifications] notification tapped', {
        identifier: request.identifier,
        destination,
      });
      if (
        destination !== '/rate' &&
        destination !== '/production' &&
        destination !== '/(tabs)/inventory'
      ) {
        return;
      }

      handledNotificationId.current = request.identifier;
      router.push(destination);
      console.info('[notifications] navigating from notification', destination);
      Notifications.clearLastNotificationResponse();
    };

    const subscription = Notifications.addNotificationResponseReceivedListener(
      handleResponse
    );

    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) handleResponse(response);
      })
      .catch((cause: unknown) => {
        console.error('Unable to read the notification response.', cause);
      });

    return () => subscription.remove();
  }, []);

  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor },
        }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="setup" options={{ gestureEnabled: false }} />
        <Stack.Screen name="rate" />
      </Stack>
    </>
  );
}
