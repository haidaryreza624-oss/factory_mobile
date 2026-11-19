import {
  DarkTheme,
  DefaultTheme,
  LocaleProvider,
  Stack,
  ThemeProvider,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
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
            <StatusBar style="auto" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: palette.background },
              }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="setup" options={{ gestureEnabled: false }} />
              <Stack.Screen name="rate" />
            </Stack>
          </AppProvider>
        </DatabaseProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}
