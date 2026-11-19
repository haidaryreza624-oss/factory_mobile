import { File, Paths } from 'expo-file-system';
import { router, useFocusEffect } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Spacing } from '@/constants/theme';
import { getBusinessCsv, getReportSnapshot, type ReportSnapshot } from '@/db/repositories/reports';
import { useTheme } from '@/hooks/use-theme';
import { fa } from '@/i18n';
import { formatAfn, formatKg, formatUsd } from '@/lib/format';
import { useApp } from '@/providers/app-provider';
import { useDatabase } from '@/providers/database-provider';

export default function ReportsScreen() {
  const db = useDatabase();
  const { factory } = useApp();
  const theme = useTheme();
  const [snapshot, setSnapshot] = useState<ReportSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!factory) return;
    try {
      setError(null);
      setSnapshot(await getReportSnapshot(db, factory.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }, [db, factory]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const exportCsv = async () => {
    if (!factory) return;
    setExporting(true);
    setError(null);
    try {
      const csv = await getBusinessCsv(db, factory.id);
      if (Platform.OS === 'web') {
        setError('خروجی CSV در نسخه وب از طریق اشتراک‌گذاری فایل پشتیبانی نمی‌شود.');
        return;
      }
      const file = new File(Paths.cache, 'factory-report.csv');
      file.write(csv);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'text/csv',
          dialogTitle: fa.reports.exportCsv,
        });
      } else {
        setError('اشتراک‌گذاری فایل در این دستگاه در دسترس نیست.');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title={fa.reports.title} subtitle={fa.reports.subtitle} onBack={() => router.back()} />
      {loading ? <View style={styles.loading}><ActivityIndicator color={theme.primary} /></View> : null}
      {error ? <Card tone="danger"><ThemedText type="small" style={{ color: theme.danger }}>{error}</ThemedText></Card> : null}
      {snapshot ? (
        <>
          <View style={styles.grid}>
            <SummaryCard label={fa.reports.sales} value={formatAfn(snapshot.salesAfn)} />
            <SummaryCard label={fa.reports.purchases} value={formatAfn(snapshot.purchasesAfn)} />
            <SummaryCard label={fa.reports.expenses} value={formatAfn(snapshot.businessExpensesAfn)} />
            <SummaryCard label={fa.reports.production} value={formatKg(snapshot.productionOutputGrams)} />
            <SummaryCard label={fa.reports.finishedStock} value={formatKg(snapshot.finishedStockGrams)} />
            <SummaryCard label={fa.reports.customerReceivable} value={formatAfn(snapshot.customerReceivableAfn)} />
            <SummaryCard label={fa.reports.supplierPayable} value={formatAfn(snapshot.supplierPayableAfn)} />
            <SummaryCard label={fa.reports.afnCash} value={formatAfn(snapshot.afnCash)} />
            <SummaryCard label={fa.reports.usdCash} value={formatUsd(snapshot.usdCash)} />
          </View>
          <AppButton
            label={fa.reports.exportCsv}
            onPress={exportCsv}
            loading={exporting}
          />
        </>
      ) : null}
    </Screen>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card style={styles.summaryCard}>
      <ThemedText type="caption" themeColor="textSecondary">{label}</ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', paddingVertical: Spacing.two },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  summaryCard: {
    flexGrow: 1,
    flexBasis: '45%',
  },
});
