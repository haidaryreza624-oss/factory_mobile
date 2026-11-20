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
import { getRawMaterials, saveRawMaterial } from '@/db/repositories/inventory';
import type { RawMaterial } from '@/db/types';
import { parseKgInput } from '@/domain/money';
import { fa } from '@/i18n';
import { deleteStoredProductPhoto, persistProductPhoto } from '@/lib/product-photos';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/providers/app-provider';
import { useDatabase } from '@/providers/database-provider';

export default function RawMaterialFormScreen() {
  const { id: rawId } = useLocalSearchParams<{ id?: string }>();
  const materialId = typeof rawId === 'string' ? rawId : undefined;
  const db = useDatabase();
  const { factory } = useApp();
  const theme = useTheme();
  const [loading, setLoading] = useState(Boolean(materialId));
  const [saving, setSaving] = useState(false);
  const [material, setMaterial] = useState<RawMaterial | null>(null);
  const [name, setName] = useState('');
  const [minimumStock, setMinimumStock] = useState('0');
  const [expectedYield, setExpectedYield] = useState('0.95');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!materialId) {
      setLoading(false);
      setMaterial(null);
      return;
    }
    if (!factory) return;
    setLoading(true);
    setError(null);
    try {
      const row = (await getRawMaterials(db, factory.id, true))
        .find((item) => item.id === materialId) ?? null;
      if (!row) throw new Error(fa.inventory.materialNotFound);
      setMaterial(row);
      setName(row.name);
      setMinimumStock(String(row.minimumStockGrams / 1000));
      setExpectedYield(String(row.expectedYieldMilli / 1000));
      setPhotoUri(row.photoUri);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }, [db, factory, materialId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const save = async () => {
    if (!factory || saving) return;
    const minimumStockGrams = parseKgInput(minimumStock);
    const expectedYieldMilli = parseKgInput(expectedYield);
    if (!name.trim()) {
      setError(fa.inventory.nameRequired);
      return;
    }
    if (minimumStockGrams === null) {
      setError(fa.inventory.invalidThreshold);
      return;
    }
    if (
      expectedYieldMilli === null ||
      expectedYieldMilli <= 0 ||
      expectedYieldMilli > 5000
    ) {
      setError(fa.inventory.invalidYield);
      return;
    }

    setSaving(true);
    setError(null);
    let savedPhotoUri: string | null = null;
    let photoCopyCreated = false;
    try {
      savedPhotoUri = photoUri ? await persistProductPhoto(photoUri) : null;
      photoCopyCreated = Boolean(photoUri && savedPhotoUri !== photoUri);
      await saveRawMaterial(db, {
        factoryId: factory.id,
        id: materialId,
        name,
        minimumStockGrams,
        expectedYieldMilli,
        photoUri: savedPhotoUri,
      });
      photoCopyCreated = false;
      if (material?.photoUri && material.photoUri !== savedPhotoUri) {
        deleteStoredProductPhoto(material.photoUri);
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
        title={materialId ? fa.inventory.editMaterial : fa.inventory.addMaterial}
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
      {!loading && (!materialId || material) ? (
        <Card>
          <AppTextInput
            label={fa.inventory.name}
            placeholder={fa.inventory.namePlaceholder}
            value={name}
            onChangeText={setName}
          />
          <ProductPhotoField value={photoUri} onChange={setPhotoUri} disabled={saving} />
          <AppTextInput
            label={fa.inventory.threshold}
            value={minimumStock}
            onChangeText={setMinimumStock}
            suffix={fa.common.kg}
            keyboardType="decimal-pad"
          />
          <AppTextInput
            label={fa.inventory.yieldPerKg}
            hint={fa.inventory.yieldHint}
            value={expectedYield}
            onChangeText={setExpectedYield}
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
