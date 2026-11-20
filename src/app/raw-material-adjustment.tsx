import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { AppTextInput } from '@/components/ui/app-text-input';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ReportTable } from '@/components/reports/report-table';
import { ProductPhoto } from '@/components/products/product-photo';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Spacing } from '@/constants/theme';
import {
  adjustRawMaterialStock,
  deleteRawMaterial,
  getRawMaterialMovements,
  getRawMaterials,
  setRawMaterialActive,
} from '@/db/repositories/inventory';
import type { RawMaterial, StockMovement } from '@/db/types';
import { parseKgInput } from '@/domain/money';
import { fa } from '@/i18n';
import { formatKg } from '@/lib/format';
import { formatJalaliTimestamp } from '@/lib/jalali';
import { toAsciiDigits, toPersianDigits } from '@/lib/persian';
import { deleteStoredProductPhoto } from '@/lib/product-photos';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/providers/app-provider';
import { useDatabase } from '@/providers/database-provider';

export default function RawMaterialAdjustmentScreen() {
  const { id: rawId } = useLocalSearchParams<{ id?: string }>();
  const materialId = typeof rawId === 'string' ? rawId : undefined;
  const db = useDatabase();
  const { factory } = useApp();
  const theme = useTheme();
  const [material, setMaterial] = useState<RawMaterial | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adjustment, setAdjustment] = useState('');
  const [memo, setMemo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const load = useCallback(async () => {
    if (!factory || !materialId) {
      setLoading(false);
      setError(fa.inventory.materialNotFound);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const current = (await getRawMaterials(db, factory.id, true))
        .find((item) => item.id === materialId) ?? null;
      if (!current) throw new Error(fa.inventory.materialNotFound);
      const history = await getRawMaterialMovements(db, factory.id, materialId);
      setMaterial(current);
      setMovements(history);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }, [db, factory, materialId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const adjust = async () => {
    if (!factory || !material || saving) return;
    const ascii = toAsciiDigits(adjustment.trim()).replace(/−/g, '-');
    const negative = ascii.startsWith('-');
    const parsed = parseKgInput(ascii.replace(/^[+-]/, '').replace(/,/g, ''));
    if (parsed === null || parsed === 0) {
      setError(fa.inventory.invalidAdjustment);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await adjustRawMaterialStock(
        db,
        factory.id,
        material.id,
        negative ? -parsed : parsed,
        memo
      );
      setAdjustment('');
      setMemo('');
      setSuccess(fa.inventory.adjustSuccess);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    if (!factory || !material || saving) return;
    setSaving(true);
    setError(null);
    try {
      await setRawMaterialActive(db, factory.id, material.id, !material.isActive);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!factory || !material || saving) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await deleteRawMaterial(db, factory.id, material.id);
      try {
        deleteStoredProductPhoto(material.photoUri);
      } catch (cause) {
        setMaterial(null);
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

  const yieldText = (milli: number) =>
    toPersianDigits((milli / 1000).toFixed(3).replace(/0+$/, '').replace(/\.$/, '').replace('.', '٫'));
  const historyRows = movements.map((movement) => [
    formatJalaliTimestamp(movement.occurredAt),
    movement.movementType === 'opening' ? fa.inventory.opening : fa.inventory.adjustmentType,
    formatKg(movement.quantityGrams),
    formatKg(movement.resultingBalanceGrams),
  ]);

  return (
    <Screen>
      <ScreenHeader
        title={fa.inventory.adjustment}
        subtitle={material?.name}
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
      {success ? (
        <Card tone="success">
          <ThemedText type="small" style={{ color: theme.success }}>{success}</ThemedText>
        </Card>
      ) : null}

      {material ? (
        <>
          <Card>
            <View style={styles.materialHeader}>
              <ProductPhoto photoUri={material.photoUri} size={88} />
              <View style={styles.materialDetails}>
                <ThemedText type="subtitle">{material.name}</ThemedText>
                <ThemedText type="small">
                  {fa.inventory.stock}: {formatKg(material.currentStockGrams)}
                </ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {fa.inventory.minimum}: {formatKg(material.minimumStockGrams)}
                </ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {fa.inventory.yieldPerKg}: {yieldText(material.expectedYieldMilli)} {fa.common.kg}
                </ThemedText>
              </View>
            </View>
          </Card>

          <Card>
            <ThemedText type="subtitle">{fa.inventory.adjustment}</ThemedText>
            <AppTextInput
              label={fa.inventory.adjustment}
              hint={fa.inventory.adjustmentHint}
              placeholder={fa.inventory.adjustmentPlaceholder}
              value={adjustment}
              onChangeText={setAdjustment}
              suffix={fa.common.kg}
              keyboardType="decimal-pad"
            />
            <AppTextInput
              label={fa.inventory.adjustmentMemo}
              optional
              multiline
              placeholder={fa.inventory.adjustmentMemoPlaceholder}
              value={memo}
              onChangeText={setMemo}
            />
            <AppButton
              label={fa.inventory.saveAdjustment}
              onPress={() => void adjust()}
              loading={saving}
            />
            <AppButton
              label={fa.inventory.editMaterial}
              variant="secondary"
              onPress={() => router.push({
                pathname: '/raw-material-form',
                params: { id: material.id },
              })}
              disabled={saving}
            />
            <AppButton
              label={material.isActive ? fa.inventory.deactivate : fa.inventory.activate}
              variant="secondary"
              onPress={() => void toggleActive()}
              loading={saving}
            />
            {confirmingDelete ? (
              <>
                <ThemedText type="caption" themeColor="textSecondary">
                  {fa.inventory.deleteHint}
                </ThemedText>
                <View style={styles.actions}>
                  <AppButton
                    label={fa.common.cancel}
                    variant="secondary"
                    onPress={() => setConfirmingDelete(false)}
                    disabled={saving}
                    style={styles.action}
                  />
                  <AppButton
                    label={fa.inventory.confirmDelete}
                    variant="danger"
                    onPress={() => void remove()}
                    loading={saving}
                    style={styles.action}
                  />
                </View>
              </>
            ) : (
              <AppButton
                label={fa.inventory.deleteMaterial}
                variant="danger"
                onPress={() => setConfirmingDelete(true)}
                disabled={saving}
              />
            )}
          </Card>

          <View style={styles.history}>
            <ThemedText type="subtitle">{fa.inventory.history}</ThemedText>
            {historyRows.length ? (
              <ReportTable
                headers={[
                  fa.reports.date,
                  fa.inventory.adjustmentType,
                  fa.inventory.movementQuantity,
                  fa.inventory.movementBalance,
                ]}
                rows={historyRows}
                columnFlexes={[1.3, 0.9, 0.9, 1]}
              />
            ) : (
              <EmptyState title={fa.inventory.historyEmpty} />
            )}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', paddingVertical: Spacing.two },
  materialHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  materialDetails: { flex: 1, minWidth: 0, gap: Spacing.one },
  actions: { flexDirection: 'row', gap: Spacing.two },
  action: { flex: 1 },
  history: { gap: Spacing.two },
});
