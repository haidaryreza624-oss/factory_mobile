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
import { getRawMaterials } from '@/db/repositories/inventory';
import type { RawMaterial } from '@/db/types';
import { fa } from '@/i18n';
import { formatKg } from '@/lib/format';
import { toPersianDigits } from '@/lib/persian';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/providers/app-provider';
import { useDatabase } from '@/providers/database-provider';

export default function InventoryScreen() {
  const db = useDatabase();
  const { factory } = useApp();
  const theme = useTheme();
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!factory) return;
    setError(null);
    try {
      setMaterials(await getRawMaterials(db, factory.id, true));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }, [db, factory]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const openDetails = (material: RawMaterial) => {
    router.push({ pathname: '/raw-material-adjustment', params: { id: material.id } });
  };

  const yieldText = (milli: number) =>
    toPersianDigits((milli / 1000).toFixed(3).replace(/0+$/, '').replace(/\.$/, '').replace('.', '٫'));

  return (
    <Screen safeAreaEdges={['top', 'left', 'right']}>
      <ScreenHeader title={fa.inventory.title} subtitle={fa.inventory.subtitle} />

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
        label={fa.inventory.addMaterial}
        onPress={() => router.push('/raw-material-form')}
      />

      {materials.length === 0 && !loading && !error ? (
        <EmptyState
          icon={Icons.inventory}
          title={fa.inventory.emptyTitle}
          body={fa.inventory.emptyBody}
        />
      ) : materials.map((material) => {
        const low = material.isActive && material.currentStockGrams < material.minimumStockGrams;
        return (
          <Card key={material.id}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${material.name}, ${fa.inventory.details}`}
              onPress={() => openDetails(material)}
              style={({ pressed }) => [styles.materialRow, pressed && styles.pressed]}
            >
              <ProductPhoto photoUri={material.photoUri} size={72} />
              <View style={styles.materialDetails}>
                <ThemedText type="smallBold">{material.name}</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {fa.inventory.stock}: {formatKg(material.currentStockGrams)}
                </ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {fa.inventory.minimum}: {formatKg(material.minimumStockGrams)}
                </ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {fa.inventory.yieldPerKg}: {yieldText(material.expectedYieldMilli)} {fa.common.kg}
                </ThemedText>
                <Badge
                  tone={!material.isActive ? 'default' : low ? 'warning' : 'success'}
                  label={!material.isActive ? fa.inventory.inactive : low ? fa.inventory.low : fa.inventory.normal}
                />
              </View>
            </Pressable>
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', paddingVertical: Spacing.two },
  materialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Radius.md,
    padding: Spacing.one,
  },
  materialDetails: { flex: 1, minWidth: 0, gap: Spacing.one },
  pressed: { opacity: 0.72 },
});
