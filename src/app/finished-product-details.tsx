import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ProductPhoto } from '@/components/products/product-photo';
import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Spacing } from '@/constants/theme';
import { deleteFinishedProduct, getFinishedProducts } from '@/db/repositories/production';
import type { FinishedProductStock } from '@/db/types';
import { fa } from '@/i18n';
import { formatKg } from '@/lib/format';
import { deleteStoredProductPhoto } from '@/lib/product-photos';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/providers/app-provider';
import { useDatabase } from '@/providers/database-provider';

export default function FinishedProductDetailsScreen() {
  const { id: productIdParam } = useLocalSearchParams<{ id?: string }>();
  const productId = typeof productIdParam === 'string' ? productIdParam : undefined;
  const db = useDatabase();
  const { factory } = useApp();
  const theme = useTheme();
  const [product, setProduct] = useState<FinishedProductStock | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!factory || !productId) {
      setLoading(false);
      setError(fa.finishedProducts.notFound);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const current = (await getFinishedProducts(db, factory.id))
        .find((item) => item.id === productId) ?? null;
      if (!current) throw new Error(fa.finishedProducts.notFound);
      setProduct(current);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }, [db, factory, productId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const remove = async () => {
    if (!factory || !product || saving) return;
    setSaving(true);
    setError(null);
    try {
      await deleteFinishedProduct(db, factory.id, product.id);
      try {
        deleteStoredProductPhoto(product.photoUri);
      } catch (cause) {
        setProduct(null);
        setError(cause instanceof Error ? cause.message : String(cause));
        return;
      }
      router.back();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader
        title={fa.finishedProducts.details}
        subtitle={product?.name}
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
      {product ? (
        <>
          <Card>
            <View style={styles.product}>
              <ProductPhoto photoUri={product.photoUri} size={144} />
              <ThemedText type="subtitle">{product.name}</ThemedText>
              <ThemedText type="small">
                {fa.finishedProducts.stock}: {formatKg(product.balanceGrams)}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {fa.finishedProducts.minimumStock}: {formatKg(product.minimumStockGrams)}
              </ThemedText>
              <Badge
                tone={product.balanceGrams < product.minimumStockGrams ? 'warning' : 'success'}
                label={product.balanceGrams < product.minimumStockGrams
                  ? fa.inventory.low
                  : fa.inventory.normal}
              />
            </View>
          </Card>
          <AppButton
            label={fa.finishedProducts.edit}
            onPress={() => router.push({
              pathname: '/finished-product-form',
              params: { id: product.id },
            })}
            disabled={saving}
          />
          {confirmingDelete ? (
            <View style={styles.actions}>
              <AppButton
                label={fa.common.cancel}
                variant="secondary"
                onPress={() => setConfirmingDelete(false)}
                disabled={saving}
                style={styles.action}
              />
              <AppButton
                label={fa.finishedProducts.confirmDelete}
                variant="danger"
                onPress={() => void remove()}
                loading={saving}
                style={styles.action}
              />
            </View>
          ) : (
            <AppButton
              label={fa.finishedProducts.delete}
              variant="danger"
              onPress={() => setConfirmingDelete(true)}
              disabled={saving}
            />
          )}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', paddingVertical: Spacing.two },
  product: { alignItems: 'center', gap: Spacing.two },
  actions: { flexDirection: 'row', gap: Spacing.two },
  action: { flex: 1 },
});
