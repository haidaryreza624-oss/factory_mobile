import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Notifications from 'expo-notifications';

import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { AppTextInput } from '@/components/ui/app-text-input';
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
import { parseNotificationTime } from '@/domain/notification-time';
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
  const [permission, setPermission] = useState<Notifications.PermissionStatus>(
    Notifications.PermissionStatus.UNDETERMINED
  );
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: true,
    rateEnabled: true,
    productionEnabled: true,
    lowStockEnabled: true,
    rateTime: '06:00',
    productionTime: '16:00',
    lowStockTime: '08:00',
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
    try {
      // Android notification channels are not required for the default channel.
      // Creating an extra channel through Expo Go can trigger a native NPE.
      const result = await Notifications.requestPermissionsAsync();
      setPermission(result.status);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'مجوز اعلان در دستگاه فعال نشد.'
      );
    }
  };

  const toggle = (key: keyof NotificationSettings) => {
    setSettings((current) => ({ ...current, [key]: !current[key] }));
  };

  const save = async () => {
    if (!factory) return;
    const rateTime = parseNotificationTime(settings.rateTime);
    const productionTime = parseNotificationTime(settings.productionTime);
    const lowStockTime = parseNotificationTime(settings.lowStockTime);
    if (!rateTime || !productionTime || !lowStockTime) {
      setError(fa.notifications.invalidTime);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await saveNotificationSettings(db, factory.id, settings);
      await Notifications.cancelAllScheduledNotificationsAsync();

      if (settings.enabled && permission === 'granted') {
        if (settings.rateEnabled) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: fa.notifications.rateReminder,
              body: 'نرخ دالر امروز را ثبت کنید.',
              data: { url: '/rate' },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DAILY,
              ...rateTime,
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
              ...productionTime,
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
              ...lowStockTime,
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

  const options: {
    key: 'rateEnabled' | 'productionEnabled' | 'lowStockEnabled';
    timeKey: 'rateTime' | 'productionTime' | 'lowStockTime';
    label: string;
  }[] = [
    { key: 'rateEnabled', timeKey: 'rateTime', label: fa.notifications.rateReminder },
    { key: 'productionEnabled', timeKey: 'productionTime', label: fa.notifications.productionReminder },
    { key: 'lowStockEnabled', timeKey: 'lowStockTime', label: fa.notifications.lowStockReminder },
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

      <Card>
        <View style={styles.settingRow}>
          <ThemedText type="smallBold" style={styles.settingLabel}>
            {settings.enabled ? fa.notifications.all : fa.notifications.deactivateAll}
          </ThemedText>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: settings.enabled }}
            onPress={() => toggle('enabled')}
            style={[
              styles.switch,
              { backgroundColor: settings.enabled ? theme.primary : theme.surfaceMuted },
            ]}>
            <View
              style={[
                styles.switchThumb,
                {
                  backgroundColor: theme.primaryText,
                  transform: [{ translateX: settings.enabled ? 18 : 0 }],
                },
              ]}
            />
          </Pressable>
        </View>
      </Card>

      {options.map((option) => (
        <Card key={option.key}>
          <View style={styles.settingRow}>
            <ThemedText type="smallBold" style={styles.settingLabel}>{option.label}</ThemedText>
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: settings[option.key] }}
              disabled={!settings.enabled}
              onPress={() => toggle(option.key)}
              style={[
                styles.switch,
                  {
                    backgroundColor: settings[option.key] ? theme.primary : theme.surfaceMuted,
                    opacity: settings.enabled ? 1 : 0.45,
                  },
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
          <AppTextInput
            label={fa.notifications.time}
            hint={fa.notifications.timeHint}
            value={settings[option.timeKey]}
            onChangeText={(value) =>
              setSettings((current) => ({ ...current, [option.timeKey]: value }))
            }
            editable={settings.enabled && settings[option.key]}
            keyboardType="numbers-and-punctuation"
            placeholder="06:30"
          />
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
