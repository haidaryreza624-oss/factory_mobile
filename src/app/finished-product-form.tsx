import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ProductPhotoField } from '@/components/products/product-photo';
import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { AppTextInput } from '@/components/ui/app-text-input';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Spacing } from '@/constants/theme';
import { getFinishedProducts, saveFinishedProduct } from '@/db/repositories/production';
import type { FinishedProductStock } from '@/db/types';
import { parseKgInput } from '@/domain/money';
import { fa } from '@/i18n';
import { deleteStoredProductPhoto, persistProductPhoto } from '@/lib/product-photos';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/providers/app-provider';
import { useDatabase } from '@/providers/database-provider';

export default function FinishedProductFormScreen() {
  const { id: productIdParam } = useLocalSearchParams<{ id?: string }>();
  const productId = typeof productIdParam === 'string' ? productIdParam : undefined;
  const db = useDatabase();
  const { factory } = useApp();
  const theme = useTheme();
  const [loading, setLoading] = useState(Boolean(productId));
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState<FinishedProductStock | null>(null);
  const [name, setName] = useState('');
  const [minimumStock, setMinimumStock] = useState('0');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!productId) {
      setLoading(false);
      setProduct(null);
      return;
    }
    if (!factory) return;
    setLoading(true);
    setError(null);
    try {
      const current = (await getFinishedProducts(db, factory.id))
        .find((item) => item.id === productId) ?? null;
      if (!current) throw new Error(fa.finishedProducts.notFound);
      setProduct(current);
      setName(current.name);
      setMinimumStock(String(current.minimumStockGrams / 1000));
      setPhotoUri(current.photoUri);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }, [db, factory, productId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const save = async () => {
    if (!factory || saving) return;
    const minimumStockGrams = parseKgInput(minimumStock);
    if (!name.trim()) {
      setError(fa.finishedProducts.nameRequired);
      return;
    }
    if (minimumStockGrams === null) {
      setError(fa.finishedProducts.invalidMinimumStock);
      return;
    }

    setSaving(true);
    setError(null);
    let savedPhotoUri: string | null = null;
    let photoCopyCreated = false;
    try {
      savedPhotoUri = photoUri ? await persistProductPhoto(photoUri) : null;
      photoCopyCreated = Boolean(photoUri && savedPhotoUri !== photoUri);
      await saveFinishedProduct(db, {
        factoryId: factory.id,
        id: productId,
        name,
        minimumStockGrams,
        photoUri: savedPhotoUri,
      });
      photoCopyCreated = false;
      if (product?.photoUri && product.photoUri !== savedPhotoUri) {
        deleteStoredProductPhoto(product.photoUri);
      }
      router.back();
    } catch (cause) {
      let message = cause instanceof Error ? cause.message : String(cause);
      if (photoCopyCreated && savedPhotoUri) {
        try {
          deleteStoredProductPhoto(savedPhotoUri);
        } catch (cleanupCause) {
          const cleanupMessage = cleanupCause instanceof Error
            ? cleanupCause.message
            : String(cleanupCause);
          message = `${message} ${cleanupMessage}`;
        }
      }
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader
        title={productId ? fa.finishedProducts.edit : fa.finishedProducts.add}
        onBack={() => router.back()}
      />
      {loading ? (
        <View style={styles.loading}><ActivityIndicator color={theme.primary} /></View>
      ) : null}
      {error ? (
        <Card tone="danger">
          <ThemedText type="small" style={{ color: theme.danger }}>{error}</ThemedText>
        </Card>
      ) : null}
      {!loading && (!productId || product) ? (
        <Card>
          <AppTextInput
            label={fa.finishedProducts.name}
            value={name}
            onChangeText={setName}
          />
          <ProductPhotoField value={photoUri} onChange={setPhotoUri} disabled={saving} />
          <AppTextInput
            label={fa.finishedProducts.minimumStock}
            value={minimumStock}
            onChangeText={setMinimumStock}
            suffix={fa.common.kg}
            keyboardType="decimal-pad"
          />
          <View style={styles.actions}>
            <AppButton
              label={fa.common.cancel}
              variant="secondary"
              onPress={() => router.back()}
              style={styles.action}
              disabled={saving}
            />
            <AppButton
              label={fa.common.save}
              onPress={() => void save()}
              loading={saving}
              style={styles.action}
            />
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', paddingVertical: Spacing.two },
  actions: { flexDirection: 'row', gap: Spacing.two },
  action: { flex: 1 },
});
