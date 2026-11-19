import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { AppTextInput } from '@/components/ui/app-text-input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Icons } from '@/constants/icons';
import { Spacing } from '@/constants/theme';
import { getRateForDate, getRateHistory, saveDailyRate } from '@/db/repositories/rates';
import type { ExchangeRate } from '@/db/types';
import { parseRateToMilli, rateMilliToInput } from '@/domain/money';
import { fa } from '@/i18n';
import { formatRateLine } from '@/lib/format';
import { formatJalaliISODate, formatKabulTime } from '@/lib/jalali';
import { getKabulDateISO } from '@/lib/time';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/providers/app-provider';
import { useDatabase } from '@/providers/database-provider';

export default function RateScreen() {
  const db = useDatabase();
  const { factory } = useApp();
  const theme = useTheme();

  const today = getKabulDateISO();

  const [value, setValue] = useState('');
  const [todayRate, setTodayRate] = useState<ExchangeRate | null>(null);
  const [history, setHistory] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    if (!factory) {
      return;
    }

    try {
      setLoadError(null);
      const [current, rows] = await Promise.all([
        getRateForDate(db, factory.id, today),
        getRateHistory(db, factory.id, 30),
      ]);

      setTodayRate(current);
      setHistory(rows);
      setValue((previous) => (previous === '' && current ? rateMilliToInput(current.rateMilli) : previous));
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : fa.errors.rateLoad);
    } finally {
      setLoading(false);
    }
  }, [db, factory, today]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  if (!factory) {
    return null;
  }

  const handleSave = async () => {
    if (saving) {
      return;
    }

    const rateMilli = parseRateToMilli(value);
    if (rateMilli === null) {
      setFieldError(fa.rate.invalid);
      setSaved(false);
      return;
    }

    setFieldError(null);
    setSaved(false);
    setSaving(true);

    try {
      await saveDailyRate(db, {
        factoryId: factory.id,
        rateMilli,
        effectiveDate: today,
      });

      await load();
      setSaved(true);
    } catch (cause) {
      setFieldError(cause instanceof Error ? cause.message : fa.errors.rateSave);
    } finally {
      setSaving(false);
    }
  };

  const latest = history[0] ?? null;

  return (
    <Screen>
      <ScreenHeader
        title={fa.rate.title}
        subtitle={fa.rate.subtitle}
        onBack={() => router.back()}
      />

      <Card tone={todayRate ? 'success' : 'warning'}>
        <View style={styles.statusRow}>
          <View style={styles.statusRight}>
            <Icon
              name={todayRate ? Icons.check : Icons.warning}
              size={20}
              color={todayRate ? theme.success : theme.warning}
            />
            <ThemedText type="smallBold">
              {todayRate ? fa.dashboard.rateCurrent : fa.dashboard.rateMissing}
            </ThemedText>
          </View>
          <Badge label={formatJalaliISODate(today)} tone={todayRate ? 'success' : 'warning'} />
        </View>

        {todayRate ? (
          <ThemedText type="number" style={styles.currentValue}>
            {formatRateLine(todayRate.rateMilli)}
          </ThemedText>
        ) : latest ? (
          <ThemedText type="caption" themeColor="textSecondary">
            {fa.rate.historyHint}: {formatRateLine(latest.rateMilli)}
          </ThemedText>
        ) : (
          <ThemedText type="caption" themeColor="textSecondary">
            {fa.rate.emptyHistory}
          </ThemedText>
        )}
      </Card>

      <Card style={styles.formCard}>
        <AppTextInput
          label={fa.rate.inputLabel}
          placeholder={fa.rate.placeholder}
          value={value}
          onChangeText={(next) => {
            setValue(next);
            setFieldError(null);
            setSaved(false);
          }}
          error={fieldError}
          keyboardType="decimal-pad"
          suffix={fa.rate.unit}
          returnKeyType="done"
          onSubmitEditing={() => {
            void handleSave();
          }}
        />

        <AppButton label={fa.rate.save} onPress={handleSave} loading={saving} />

        {saved ? (
          <View style={styles.savedRow}>
            <Icon name={Icons.check} size={18} color={theme.success} />
            <ThemedText type="small" style={{ color: theme.success }}>
              {fa.rate.saved}
            </ThemedText>
          </View>
        ) : null}

        <ThemedText type="caption" themeColor="textSecondary">
          {fa.rate.changeNote}
        </ThemedText>
      </Card>

      <View style={styles.sectionHeader}>
        <ThemedText type="subtitle">{fa.rate.history}</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {fa.rate.historyHint}
        </ThemedText>
      </View>

      {loadError ? (
        <Card tone="danger">
          <ThemedText type="smallBold" style={{ color: theme.danger }}>
            {fa.rate.loadError}
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            {loadError}
          </ThemedText>
        </Card>
      ) : null}

      {loading && history.length === 0 ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : history.length === 0 ? (
        <EmptyState icon={Icons.rate} title={fa.rate.emptyHistory} />
      ) : (
        <Card padded={false}>
          {history.map((rate, index) => (
            <View
              key={rate.id}
              style={[
                styles.historyRow,
                index > 0 && { borderTopColor: theme.border, borderTopWidth: StyleSheet.hairlineWidth },
              ]}>
              <View style={styles.historyTexts}>
                <View style={styles.historyDateRow}>
                  <ThemedText type="smallBold">
                    {formatJalaliISODate(rate.effectiveDate)}
                  </ThemedText>
                  {rate.effectiveDate === today ? <Badge tone="success" label={fa.rate.todayBadge} /> : null}
                </View>
                <ThemedText type="caption" themeColor="textSecondary">
                  {fa.rate.enteredAt} {formatKabulTime(rate.enteredAt)}
                </ThemedText>
              </View>
              <ThemedText type="smallBold" style={styles.historyValue}>
                {formatRateLine(rate.rateMilli)}
              </ThemedText>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  statusRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexShrink: 1,
  },
  currentValue: {
    fontSize: 24,
    lineHeight: 34,
  },
  formCard: {
    gap: Spacing.three,
    padding: Spacing.four,
  },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  sectionHeader: {
    gap: 2,
    paddingTop: Spacing.two,
  },
  loading: {
    paddingVertical: Spacing.four,
    alignItems: 'center',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  historyTexts: {
    gap: 2,
    flexShrink: 1,
  },
  historyDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  historyValue: {
    textAlign: 'left',
  },
});
