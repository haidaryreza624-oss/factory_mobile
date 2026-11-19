import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import * as Notifications from 'expo-notifications';

import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Radius, Spacing } from '@/constants/theme';
import {
  getNotificationSettings,
  saveNotificationSettings,
  type NotificationSettings,
} from '@/db/repositories/notification-settings';
import { fa } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/providers/app-provider';
import { useDatabase } from '@/providers/database-provider';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function NotificationsScreen() {
  const db = useDatabase();
  const { factory } = useApp();
  const theme = useTheme();
  const [permission, setPermission] = useState<Notifications.PermissionStatus>('undetermined');
  const [settings, setSettings] = useState<NotificationSettings>({
    rateEnabled: true,
    productionEnabled: true,
    lowStockEnabled: true,
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Notifications.getPermissionsAsync()
      .then((result) => setPermission(result.status))
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : String(cause))
      );
  }, []);

  useEffect(() => {
    if (!factory) return;
    getNotificationSettings(db, factory.id)
      .then(setSettings)
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : String(cause))
      );
  }, [db, factory]);

  const requestPermission = async () => {
    setError(null);
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('factory-reminders', {
        name: 'یادآوری‌های فابریکه',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const result = await Notifications.requestPermissionsAsync();
    setPermission(result.status);
  };

  const toggle = (key: keyof NotificationSettings) => {
    setSettings((current) => ({ ...current, [key]: !current[key] }));
  };

  const save = async () => {
    if (!factory) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await saveNotificationSettings(db, factory.id, settings);
      await Notifications.cancelAllScheduledNotificationsAsync();

      if (permission === 'granted') {
        if (settings.rateEnabled) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: fa.notifications.rateReminder,
              body: 'نرخ دالر امروز را ثبت کنید.',
              data: { url: '/rate' },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DAILY,
              hour: 6,
              minute: 0,
            },
          });
        }
        if (settings.productionEnabled) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: fa.notifications.productionReminder,
              body: 'تولید امروز را ثبت کنید.',
              data: { url: '/production' },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DAILY,
              hour: 16,
              minute: 0,
            },
          });
        }
        if (settings.lowStockEnabled) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: fa.notifications.lowStockReminder,
              body: 'موجودی مواد اولیه را بررسی کنید.',
              data: { url: '/(tabs)/inventory' },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DAILY,
              hour: 8,
              minute: 0,
            },
          });
        }
      }
      setSuccess(fa.notifications.saved);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  };

  const options: Array<{
    key: keyof NotificationSettings;
    label: string;
  }> = [
    { key: 'rateEnabled', label: fa.notifications.rateReminder },
    { key: 'productionEnabled', label: fa.notifications.productionReminder },
    { key: 'lowStockEnabled', label: fa.notifications.lowStockReminder },
  ];

  return (
    <Screen>
      <ScreenHeader title={fa.notifications.title} subtitle={fa.notifications.subtitle} onBack={() => router.back()} />

      <Card>
        <ThemedText type="smallBold">{fa.notifications.permission}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {permission === 'granted' ? fa.notifications.granted : fa.notifications.denied}
        </ThemedText>
        {permission !== 'granted' ? (
          <AppButton label={fa.notifications.requestPermission} onPress={requestPermission} />
        ) : null}
      </Card>

      {options.map((option) => (
        <Card key={option.key}>
          <View style={styles.settingRow}>
            <ThemedText type="smallBold" style={styles.settingLabel}>{option.label}</ThemedText>
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: settings[option.key] }}
              onPress={() => toggle(option.key)}
              style={[
                styles.switch,
                { backgroundColor: settings[option.key] ? theme.primary : theme.surfaceMuted },
              ]}>
              <View
                style={[
                  styles.switchThumb,
                  {
                    backgroundColor: theme.primaryText,
                    transform: [{ translateX: settings[option.key] ? 18 : 0 }],
                  },
                ]}
              />
            </Pressable>
          </View>
        </Card>
      ))}

      {error ? <Card tone="danger"><ThemedText type="small" style={{ color: theme.danger }}>{error}</ThemedText></Card> : null}
      {success ? <Card tone="success"><ThemedText type="small" style={{ color: theme.success }}>{success}</ThemedText></Card> : null}
      <AppButton label={fa.notifications.save} onPress={save} loading={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  settingLabel: {
    flex: 1,
  },
  switch: {
    width: 44,
    height: 26,
    borderRadius: Radius.pill,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  switchThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
});
