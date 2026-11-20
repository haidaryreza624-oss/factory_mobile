import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ProductPhoto } from '@/components/products/product-photo';
import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Icons } from '@/constants/icons';
import { Spacing } from '@/constants/theme';
import {
  getFinishedProductBalance,
  getFinishedProducts,
  getProductionBatches,
} from '@/db/repositories/production';
import type { FinishedProductStock, ProductionBatch } from '@/db/types';
import { fa } from '@/i18n';
import { formatAfn, formatKg } from '@/lib/format';
import { formatJalaliISODate } from '@/lib/jalali';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/providers/app-provider';
import { useDatabase } from '@/providers/database-provider';

export default function ProductionScreen() {
  const db = useDatabase();
  const { factory } = useApp();
  const theme = useTheme();
  const [products, setProducts] = useState<FinishedProductStock[]>([]);
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [finishedBalance, setFinishedBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products]
  );

  const load = useCallback(async () => {
    if (!factory) return;
    setLoading(true);
    setError(null);
    try {
      const [productRows, batchRows, balance] = await Promise.all([
        getFinishedProducts(db, factory.id),
        getProductionBatches(db, factory.id),
        getFinishedProductBalance(db, factory.id),
      ]);
      setProducts(productRows);
      setBatches(batchRows);
      setFinishedBalance(balance);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }, [db, factory]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <Screen>
      <ScreenHeader
        title={fa.production.title}
        subtitle={fa.production.subtitle}
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

      <Card>
        <ThemedText type="caption" themeColor="textSecondary">
          {fa.production.finishedBalance}
        </ThemedText>
        <ThemedText type="number">{formatKg(finishedBalance)}</ThemedText>
      </Card>
      <AppButton
        label={fa.production.newBatch}
        onPress={() => router.push('/production-form')}
      />

      <ThemedText type="subtitle">{fa.production.history}</ThemedText>
      {batches.length === 0 && !loading && !error ? (
        <EmptyState icon={Icons.operations} title={fa.production.empty} />
      ) : batches.map((batch) => {
        const product = productById.get(batch.finishedProductId);
        return (
          <Pressable
            key={batch.id}
            accessibilityRole="button"
            accessibilityLabel={`${product?.name ?? fa.production.productUnavailable}, ${formatJalaliISODate(batch.productionDate)}`}
            onPress={() => router.push({
              pathname: '/production-details',
              params: { id: batch.id },
            })}
            style={({ pressed }) => [pressed && styles.pressed]}
          >
            <Card>
              <View style={styles.batch}>
                <ProductPhoto photoUri={product?.photoUri ?? null} size={64} />
                <View style={styles.batchDetails}>
                  <View style={styles.batchHeader}>
                    <ThemedText type="smallBold">
                      {product?.name ?? fa.production.productUnavailable}
                    </ThemedText>
                    <ThemedText type="caption" themeColor="textSecondary">
                      {formatJalaliISODate(batch.productionDate)}
                    </ThemedText>
                  </View>
                  <ThemedText type="caption" themeColor="textSecondary">
                    {fa.production.actualOutput}: {formatKg(batch.actualOutputGrams)}
                  </ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary">
                    {fa.production.totalInput}: {formatKg(batch.totalInputGrams)}
                  </ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary">
                    {fa.production.costPerKg}: {formatAfn(batch.costPerKgAfn)}
                  </ThemedText>
                </View>
              </View>
            </Card>
          </Pressable>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', paddingVertical: Spacing.two },
  batch: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  batchDetails: { flex: 1, minWidth: 0, gap: Spacing.one },
  batchHeader: { gap: Spacing.one },
  pressed: { opacity: 0.75 },
});
