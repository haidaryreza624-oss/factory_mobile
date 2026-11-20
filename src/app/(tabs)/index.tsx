import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Icons } from '@/constants/icons';
import { Radius, Spacing } from '@/constants/theme';
import { getDashboardSnapshot } from '@/db/repositories/dashboard';
import {
  getCloudLastSyncedAt,
  getCloudRevision,
} from '@/db/repositories/cloud-backup';
import type { DashboardSnapshot } from '@/db/types';
import { fa } from '@/i18n';
import { formatCount, formatRateLine } from '@/lib/format';
import { formatJalaliDate } from '@/lib/jalali';
import { isCloudConfigured } from '@/lib/cloud-client';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/providers/app-provider';
import { useDatabase } from '@/providers/database-provider';

export default function DashboardScreen() {
  const db = useDatabase();
  const { factory } = useApp();
  const theme = useTheme();

  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cloudRevision, setCloudRevision] = useState(0);
  const [lastCloudSync, setLastCloudSync] = useState<string | null>(null);
  const [cloudConfigured, setCloudConfigured] = useState(false);

  const load = useCallback(async () => {
    if (!factory) {
      return;
    }

    try {
      setError(null);
      const [next, revision, lastSyncedAt] = await Promise.all([
        getDashboardSnapshot(db, factory.id),
        getCloudRevision(db, factory.id),
        getCloudLastSyncedAt(db, factory.id),
      ]);
      setSnapshot(next);
      setCloudRevision(revision);
      setLastCloudSync(lastSyncedAt);
      setCloudConfigured(isCloudConfigured());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : fa.dashboard.loadError);
    } finally {
      setLoading(false);
    }
  }, [db, factory]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  if (!factory) {
    return null;
  }

  const greeting = factory.ownerName
    ? `${fa.dashboard.greeting}، ${factory.ownerName}`
    : fa.dashboard.greeting;

  const quickActions = [
    { label: fa.dashboard.addPurchase, icon: Icons.cart, href: '/purchases' as const },
    { label: fa.dashboard.newProduction, icon: Icons.operations, href: '/production' as const },
    { label: fa.dashboard.createSale, icon: Icons.receipt, href: '/sales' as const },
    { label: fa.dashboard.addExpense, icon: Icons.wallet, href: '/business-expenses' as const },
  ];

  const cloudBackupActive = cloudConfigured && cloudRevision > 0;
  const cloudStatusText = !cloudConfigured
    ? fa.dashboard.syncNotConfigured
    : cloudBackupActive
      ? lastCloudSync
        ? `${fa.cloudBackup.lastBackup}: ${new Date(lastCloudSync).toLocaleString('fa-AF')}`
        : fa.dashboard.syncActive
      : fa.dashboard.syncNotEnabled;

  return (
    <Screen safeAreaEdges={['top', 'left', 'right']}>
      <ScreenHeader
        title={greeting}
        subtitle={`${factory.name} · ${formatJalaliDate(new Date(), { withWeekday: true })}`}
        action={
          <IconButton
            icon={Icons.sync}
            label={fa.common.retry}
            onPress={() => {
              setLoading(true);
              void load();
            }}
          />
        }
      />

      {loading && !snapshot ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.primary} />
          <ThemedText type="small" themeColor="textSecondary">
            {fa.common.loading}
          </ThemedText>
        </View>
      ) : null}

      {error ? (
        <Card tone="danger">
          <ThemedText type="smallBold" style={{ color: theme.danger }}>
            {fa.dashboard.loadError}
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            {error}
          </ThemedText>
        </Card>
      ) : null}

      {snapshot ? (
        <>
          <Card tone={snapshot.todayRate ? 'success' : 'warning'}>
            <View style={styles.cardTitleRow}>
              <View style={styles.cardTitleRight}>
                <Icon
                  name={snapshot.todayRate ? Icons.check : Icons.warning}
                  size={20}
                  color={snapshot.todayRate ? theme.success : theme.warning}
                />
                <ThemedText type="subtitle">{fa.dashboard.rateTitle}</ThemedText>
              </View>
              <Badge
                tone={snapshot.todayRate ? 'success' : 'warning'}
                label={fa.rate.todayBadge}
              />
            </View>

            {snapshot.todayRate ? (
              <>
                <ThemedText type="small" themeColor="textSecondary">
                  {fa.dashboard.rateCurrent}
                </ThemedText>
                <ThemedText type="number" style={styles.rateValue}>
                  {formatRateLine(snapshot.todayRate.rateMilli)}
                </ThemedText>
              </>
            ) : (
              <>
                <ThemedText type="smallBold">{fa.dashboard.rateMissing}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {fa.dashboard.noRateBody}
                </ThemedText>
              </>
            )}

            <AppButton
              label={snapshot.todayRate ? fa.dashboard.updateRate : fa.dashboard.enterRate}
              onPress={() => router.push('/rate')}
              variant={snapshot.todayRate ? 'secondary' : 'primary'}
              style={styles.rateButton}
            />
          </Card>

          <View style={styles.section}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              {fa.dashboard.quickActions}
            </ThemedText>
            <View style={styles.actionsGrid}>
              {quickActions.map((action) => (
                <Pressable
                  key={action.label}
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                  onPress={() => router.push(action.href)}
                  style={({ pressed }) => [
                    styles.actionCard,
                    {
                      backgroundColor: pressed ? theme.backgroundSelected : theme.surface,
                      borderColor: theme.border,
                      opacity: pressed ? 0.86 : 1,
                    },
                  ]}>
                  <View style={[styles.actionIcon, { backgroundColor: theme.primarySoft }]}>
                    <Icon name={action.icon} size={22} color={theme.primary} />
                  </View>
                  <ThemedText type="smallBold" numberOfLines={2}>
                    {action.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={fa.dashboard.syncTitle}
            onPress={() => router.push('/cloud-backup')}
            style={({ pressed }) => [pressed && styles.cardPressed]}>
            <Card tone={cloudBackupActive ? 'success' : 'info'}>
              <View style={styles.syncRow}>
                <View style={styles.syncTexts}>
                  <ThemedText type="smallBold">{fa.dashboard.syncTitle}</ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary">
                    {cloudStatusText}
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.syncIcon,
                    {
                      backgroundColor: cloudBackupActive ? theme.successSoft : theme.infoSoft,
                    },
                  ]}>
                  <Icon
                    name={cloudBackupActive ? Icons.check : Icons.cloudOff}
                    size={22}
                    color={cloudBackupActive ? theme.success : theme.info}
                  />
                </View>
                <Icon name={Icons.chevronLeft} size={18} color={theme.textSecondary} />
              </View>
              {snapshot.pendingSyncCount > 0 ? (
                <Badge
                  tone="warning"
                  label={fa.dashboard.syncPending(formatCount(snapshot.pendingSyncCount))}
                />
              ) : null}
            </Card>
          </Pressable>

          {cloudRevision === 0 ? (
            <ThemedText type="caption" themeColor="textSecondary" style={styles.footnote}>
              {fa.dashboard.localNotice}
            </ThemedText>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  cardTitleRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexShrink: 1,
  },
  rateValue: {
    fontSize: 24,
    lineHeight: 34,
  },
  rateButton: {
    marginTop: Spacing.two,
  },
  section: {
    gap: Spacing.two,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  actionCard: {
    flexGrow: 1,
    flexBasis: '47%',
    minWidth: 144,
    minHeight: 104,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.two,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  syncTexts: {
    flex: 1,
    gap: 2,
  },
  syncIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footnote: {
    textAlign: 'center',
    writingDirection: 'rtl',
    paddingHorizontal: Spacing.three,
  },
  cardPressed: {
    opacity: 0.86,
  },
});
