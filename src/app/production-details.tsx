import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ProductPhoto } from '@/components/products/product-photo';
import { ReportTable } from '@/components/reports/report-table';
import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Spacing } from '@/constants/theme';
import {
  getFinishedProducts,
  getProductionBatch,
} from '@/db/repositories/production';
import type { FinishedProductStock, ProductionBatch } from '@/db/types';
import { fa } from '@/i18n';
import { formatAfn, formatKg } from '@/lib/format';
import { formatJalaliISODate } from '@/lib/jalali';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/providers/app-provider';
import { useDatabase } from '@/providers/database-provider';

export default function ProductionDetailsScreen() {
  const { id: batchIdParam, created } = useLocalSearchParams<{
    id?: string;
    created?: string;
  }>();
  const batchId = typeof batchIdParam === 'string' ? batchIdParam : undefined;
  const db = useDatabase();
  const { factory } = useApp();
  const theme = useTheme();
  const [batch, setBatch] = useState<ProductionBatch | null>(null);
  const [product, setProduct] = useState<FinishedProductStock | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!factory || !batchId) {
      setLoading(false);
      setError(fa.production.batchNotFound);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [currentBatch, products] = await Promise.all([
        getProductionBatch(db, factory.id, batchId),
        getFinishedProducts(db, factory.id),
      ]);
      if (!currentBatch) throw new Error(fa.production.batchNotFound);
      setBatch(currentBatch);
      setProduct(products.find((item) => item.id === currentBatch.finishedProductId) ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }, [batchId, db, factory]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const inputRows = batch?.inputs.map((input) => [
    input.rawMaterialName,
    formatKg(input.quantityGrams),
    formatKg(input.expectedOutputGrams),
  ]) ?? [];

  return (
    <Screen>
      <ScreenHeader
        title={fa.production.batchDetails}
        subtitle={batch ? formatJalaliISODate(batch.productionDate) : undefined}
        onBack={() => router.back()}
      />
      {loading ? (
        <View style={styles.loading}><ActivityIndicator color={theme.primary} /></View>
      ) : null}
      {error ? (
        <Card tone="danger">
          <ThemedText type="small" style={{ color: theme.danger }}>{error}</ThemedText>
          <AppButton label={fa.common.retry} variant="secondary" onPress={() => void load()} />
        </Card>
      ) : null}
      {created === '1' ? (
        <Card tone="success">
          <ThemedText type="small" style={{ color: theme.success }}>{fa.production.posted}</ThemedText>
        </Card>
      ) : null}
      {batch ? (
        <>
          <Card>
            <View style={styles.product}>
              <ProductPhoto photoUri={product?.photoUri ?? null} size={88} />
              <ThemedText type="subtitle">
                {product?.name ?? fa.production.productUnavailable}
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {fa.reports.date}: {formatJalaliISODate(batch.productionDate)}
              </ThemedText>
            </View>
          </Card>

          <View style={styles.metrics}>
            <Metric label={fa.production.totalInput} value={formatKg(batch.totalInputGrams)} />
            <Metric label={fa.production.expectedOutput} value={formatKg(batch.expectedOutputGrams)} />
            <Metric label={fa.production.actualOutput} value={formatKg(batch.actualOutputGrams)} />
            <Metric label={fa.production.expectedLoss} value={formatKg(batch.expectedLossGrams)} />
            <Metric label={fa.production.actualLoss} value={formatKg(batch.actualLossGrams)} />
            <Metric label={fa.production.additionalLoss} value={formatKg(batch.additionalLossGrams)} />
            <Metric label={fa.production.batchCost} value={formatAfn(batch.batchCostAfn)} />
            <Metric label={fa.production.costPerKg} value={formatAfn(batch.costPerKgAfn)} />
          </View>

          <ThemedText type="subtitle">{fa.production.materialsUsed}</ThemedText>
          {inputRows.length > 0 ? (
            <ReportTable
              headers={[
                fa.production.material,
                fa.production.quantity,
                fa.production.expectedOutput,
              ]}
              rows={inputRows}
              columnFlexes={[1.3, 0.9, 1]}
            />
          ) : null}
          {batch.notes ? (
            <Card>
              <ThemedText type="smallBold">{fa.production.notes}</ThemedText>
              <ThemedText type="small">{batch.notes}</ThemedText>
            </Card>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card style={styles.metric}>
      <ThemedText type="caption" themeColor="textSecondary">{label}</ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', paddingVertical: Spacing.two },
  product: { alignItems: 'center', gap: Spacing.two },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  metric: { flexGrow: 1, flexBasis: '45%' },
});
