import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Icons } from '@/constants/icons';
import { Radius, Spacing } from '@/constants/theme';
import { getDashboardSnapshot } from '@/db/repositories/dashboard';
import type { DashboardSnapshot } from '@/db/types';
import { afnEquivalent } from '@/domain/money';
import { fa } from '@/i18n';
import { formatAfn, formatCount, formatRateLine, formatUsd } from '@/lib/format';
import { formatJalaliDate } from '@/lib/jalali';
import { toPersianDigits } from '@/lib/persian';
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

  const load = useCallback(async () => {
    if (!factory) {
      return;
    }

    try {
      setError(null);
      const next = await getDashboardSnapshot(db, factory.id);
      setSnapshot(next);
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

  const showComingSoon = () => {
    Alert.alert(fa.common.comingSoon, fa.common.comingSoonBody);
  };

  const quickActions: { label: string; icon: IconName }[] = [
    { label: fa.dashboard.addPurchase, icon: Icons.cart },
    { label: fa.dashboard.newProduction, icon: Icons.operations },
    { label: fa.dashboard.createSale, icon: Icons.receipt },
    { label: fa.dashboard.addExpense, icon: Icons.wallet },
  ];

  const totalAfn =
    snapshot && snapshot.todayRate
      ? snapshot.afnBalance +
        afnEquivalent('USD', snapshot.usdBalance, snapshot.todayRate.rateMilli)
      : null;

  return (
    <Screen>
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
          <Card style={styles.cashCard}>
            <View style={styles.cardTitleRow}>
              <View style={styles.cardTitleRight}>
                <Icon name={Icons.wallet} size={20} color={theme.primary} />
                <ThemedText type="subtitle">{fa.dashboard.cashTitle}</ThemedText>
              </View>
              {snapshot.pendingSyncCount > 0 ? (
                <Badge
                  tone="info"
                  label={fa.dashboard.syncPending(formatCount(snapshot.pendingSyncCount))}
                />
              ) : null}
            </View>

            <View style={styles.balanceRow}>
              <View style={styles.balanceColumn}>
                <ThemedText type="caption" themeColor="textSecondary">
                  {fa.dashboard.afnCash}
                </ThemedText>
                <ThemedText type="number" style={styles.balanceValue} numberOfLines={1}>
                  {formatAfn(snapshot.afnBalance)}
                </ThemedText>
              </View>
              <View style={[styles.balanceDivider, { backgroundColor: theme.border }]} />
              <View style={styles.balanceColumn}>
                <ThemedText type="caption" themeColor="textSecondary">
                  {fa.dashboard.usdCash}
                </ThemedText>
                <ThemedText type="number" style={styles.balanceValue} numberOfLines={1}>
                  {formatUsd(snapshot.usdBalance)}
                </ThemedText>
              </View>
            </View>

            <View style={[styles.totalRow, { borderTopColor: theme.border }]}>
              <ThemedText type="small" themeColor="textSecondary">
                {fa.dashboard.totalCash}
              </ThemedText>
              {totalAfn !== null ? (
                <ThemedText type="smallBold">{formatAfn(totalAfn)}</ThemedText>
              ) : (
                <ThemedText type="caption" themeColor="textSecondary" style={styles.totalNote}>
                  {fa.dashboard.totalCashNeedsRate}
                </ThemedText>
              )}
            </View>
          </Card>

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
                  onPress={showComingSoon}
                  style={({ pressed }) => [
                    styles.actionCard,
                    {
                      backgroundColor: pressed ? theme.backgroundSelected : theme.surface,
                      borderColor: theme.border,
                    },
                  ]}>
                  <View style={[styles.actionIcon, { backgroundColor: theme.primarySoft }]}>
                    <Icon name={action.icon} size={22} color={theme.primary} />
                  </View>
                  <ThemedText type="small">{action.label}</ThemedText>
                  <Badge label={fa.common.comingSoon} />
                </Pressable>
              ))}
            </View>
          </View>

          <Card>
            <View style={styles.syncRow}>
              <View style={styles.syncTexts}>
                <ThemedText type="smallBold">{fa.dashboard.syncTitle}</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {fa.dashboard.syncNotConfigured}
                </ThemedText>
              </View>
              <View style={[styles.syncIcon, { backgroundColor: theme.infoSoft }]}>
                <Icon name={Icons.cloudOff} size={22} color={theme.info} />
              </View>
            </View>
            <ThemedText type="caption" themeColor="textSecondary">
              {fa.dashboard.syncLocalOnly}
              {snapshot.pendingSyncCount > 0
                ? ` · ${toPersianDigits(String(snapshot.pendingSyncCount))} ریکارد در انتظار`
                : ''}
            </ThemedText>
          </Card>

          <ThemedText type="caption" themeColor="textSecondary" style={styles.footnote}>
            {fa.dashboard.localNotice}
          </ThemedText>
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
  cashCard: {
    gap: Spacing.three,
    paddingVertical: Spacing.four,
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
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.three,
  },
  balanceColumn: {
    flex: 1,
    gap: 2,
  },
  balanceValue: {
    fontSize: 22,
    lineHeight: 32,
  },
  balanceDivider: {
    width: StyleSheet.hairlineWidth,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.two,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  totalNote: {
    flexShrink: 1,
    textAlign: 'left',
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
    minWidth: 150,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.two,
    alignItems: 'flex-start',
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
});
