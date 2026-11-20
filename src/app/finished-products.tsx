import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ProductPhoto } from '@/components/products/product-photo';
import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Icons } from '@/constants/icons';
import { Radius, Spacing } from '@/constants/theme';
import { getFinishedProducts } from '@/db/repositories/production';
import type { FinishedProductStock } from '@/db/types';
import { fa } from '@/i18n';
import { formatKg } from '@/lib/format';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/providers/app-provider';
import { useDatabase } from '@/providers/database-provider';

export default function FinishedProductsScreen() {
  const db = useDatabase();
  const { factory } = useApp();
  const theme = useTheme();
  const [products, setProducts] = useState<FinishedProductStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!factory) return;
    setError(null);
    try {
      setProducts(await getFinishedProducts(db, factory.id));
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
        title={fa.finishedProducts.title}
        subtitle={fa.finishedProducts.subtitle}
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
      <AppButton
        label={fa.finishedProducts.add}
        onPress={() => router.push('/finished-product-form')}
      />
      {products.length === 0 && !loading && !error ? (
        <EmptyState
          icon={Icons.factory}
          title={fa.finishedProducts.empty}
          body={fa.finishedProducts.emptyBody}
        />
      ) : products.map((product) => (
        <Card key={product.id}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${product.name}, ${fa.finishedProducts.details}`}
            onPress={() => router.push({
              pathname: '/finished-product-details',
              params: { id: product.id },
            })}
            style={({ pressed }) => [styles.productRow, pressed && styles.pressed]}
          >
            <ProductPhoto photoUri={product.photoUri} size={72} />
            <View style={styles.productDetails}>
              <ThemedText type="smallBold">{product.name}</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {fa.finishedProducts.stock}: {formatKg(product.balanceGrams)}
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {fa.finishedProducts.minimumStock}: {formatKg(product.minimumStockGrams)}
              </ThemedText>
              <Badge
                tone={product.balanceGrams < product.minimumStockGrams ? 'warning' : 'success'}
                label={product.balanceGrams < product.minimumStockGrams
                  ? fa.inventory.low
                  : fa.inventory.normal}
              />
            </View>
          </Pressable>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', paddingVertical: Spacing.two },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Radius.md,
    padding: Spacing.one,
  },
  productDetails: { flex: 1, minWidth: 0, gap: Spacing.one },
  pressed: { opacity: 0.72 },
});
