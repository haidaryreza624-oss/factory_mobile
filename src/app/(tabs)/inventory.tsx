import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { AppTextInput } from '@/components/ui/app-text-input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Icons } from '@/constants/icons';
import { Spacing } from '@/constants/theme';
import {
  adjustRawMaterialStock,
  getRawMaterialMovements,
  getRawMaterials,
  saveRawMaterial,
  setRawMaterialActive,
} from '@/db/repositories/inventory';
import type { RawMaterial, StockMovement } from '@/db/types';
import { parseKgInput } from '@/domain/money';
import { fa } from '@/i18n';
import { formatKg } from '@/lib/format';
import { formatJalaliTimestamp } from '@/lib/jalali';
import { toAsciiDigits, toPersianDigits } from '@/lib/persian';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/providers/app-provider';
import { useDatabase } from '@/providers/database-provider';

export default function InventoryScreen() {
  const db = useDatabase();
  const { factory } = useApp();
  const theme = useTheme();
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [selected, setSelected] = useState<RawMaterial | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<RawMaterial | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [threshold, setThreshold] = useState('');
  const [yieldPerKg, setYieldPerKg] = useState('');
  const [initialStock, setInitialStock] = useState('');
  const [adjustment, setAdjustment] = useState('');
  const [adjustmentMemo, setAdjustmentMemo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!factory) return;
    try {
      setError(null);
      const rows = await getRawMaterials(db, factory.id, true);
      setMaterials(rows);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }, [db, factory]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const openForm = (material: RawMaterial | null = null) => {
    setEditing(material);
    setName(material?.name ?? '');
    setDescription(material?.description ?? '');
    setThreshold(material ? String(material.minimumStockGrams / 1000) : '');
    setYieldPerKg(material ? String(material.expectedYieldMilli / 1000) : '0.95');
    setInitialStock('');
    setError(null);
    setSuccess(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!factory || saving) return;
    setError(null);

    const thresholdGrams = parseKgInput(threshold);
    const yieldMilli = parseKgInput(yieldPerKg);
    const initialGrams = parseKgInput(initialStock);

    if (!name.trim()) {
      setError(fa.inventory.nameRequired);
      return;
    }
    if (thresholdGrams === null) {
      setError(fa.inventory.invalidThreshold);
      return;
    }
    if (yieldMilli === null || yieldMilli <= 0 || yieldMilli > 5000) {
      setError(fa.inventory.invalidYield);
      return;
    }
    if (!editing && initialGrams === null) {
      setError(fa.inventory.invalidInitialStock);
      return;
    }

    setSaving(true);
    try {
      await saveRawMaterial(db, {
        factoryId: factory.id,
        id: editing?.id,
        name,
        description,
        minimumStockGrams: thresholdGrams,
        expectedYieldMilli: yieldMilli,
        initialStockGrams: editing ? undefined : initialGrams ?? 0,
      });
      setShowForm(false);
      setSuccess(fa.inventory.saveSuccess);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  };

  const selectMaterial = async (material: RawMaterial) => {
    if (!factory) return;
    setSelected(material);
    setAdjustment('');
    setAdjustmentMemo('');
    setSuccess(null);
    setError(null);
    setMovements(await getRawMaterialMovements(db, factory.id, material.id));
  };

  const handleAdjust = async () => {
    if (!factory || !selected) return;
    const ascii = toAsciiDigits(adjustment.trim()).replace(/−/g, '-');
    const negative = ascii.startsWith('-');
    const parsed = parseKgInput(ascii.replace(/^[+-]/, '').replace(/,/g, ''));
    if (parsed === null || parsed === 0) {
      setError(fa.inventory.invalidAdjustment);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await adjustRawMaterialStock(
        db,
        factory.id,
        selected.id,
        negative ? -parsed : parsed,
        adjustmentMemo
      );
      setAdjustment('');
      setAdjustmentMemo('');
      setSuccess(fa.inventory.adjustSuccess);
      await load();
      const refreshed = (await getRawMaterials(db, factory.id, true)).find((row) => row.id === selected.id) ?? null;
      setSelected(refreshed);
      setMovements(await getRawMaterialMovements(db, factory.id, selected.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    if (!factory || !selected) return;
    await setRawMaterialActive(db, factory.id, selected.id, !selected.isActive);
    await load();
    const refreshed = (await getRawMaterials(db, factory.id, true)).find((row) => row.id === selected.id) ?? null;
    setSelected(refreshed);
  };

  const yieldText = (milli: number) =>
    toPersianDigits((milli / 1000).toFixed(3).replace(/0+$/, '').replace(/\.$/, '').replace('.', '٫'));

  return (
    <Screen>
      <ScreenHeader title={fa.inventory.title} subtitle={fa.inventory.subtitle} />

      {loading ? (
        <View style={styles.loading}><ActivityIndicator color={theme.primary} /></View>
      ) : null}

      {error ? (
        <Card tone="danger"><ThemedText type="small" style={{ color: theme.danger }}>{error}</ThemedText></Card>
      ) : null}
      {success ? (
        <Card tone="success"><ThemedText type="small" style={{ color: theme.success }}>{success}</ThemedText></Card>
      ) : null}

      <AppButton
        label={fa.inventory.addMaterial}
        icon={<Icon name={Icons.plus} size={20} color={theme.primaryText} />}
        onPress={() => openForm()}
      />

      {showForm ? (
        <Card>
          <ThemedText type="subtitle">{editing ? fa.inventory.editMaterial : fa.inventory.addMaterial}</ThemedText>
          <AppTextInput label={fa.inventory.name} placeholder={fa.inventory.namePlaceholder} value={name} onChangeText={setName} />
          <AppTextInput label={fa.inventory.description} placeholder={fa.inventory.descriptionPlaceholder} value={description} onChangeText={setDescription} />
          <AppTextInput label={fa.inventory.threshold} value={threshold} onChangeText={setThreshold} suffix={fa.common.kg} keyboardType="decimal-pad" />
          <AppTextInput label={fa.inventory.yieldPerKg} hint={fa.inventory.yieldHint} value={yieldPerKg} onChangeText={setYieldPerKg} suffix={fa.common.kg} keyboardType="decimal-pad" />
          {!editing ? (
            <AppTextInput label={fa.inventory.initialStock} value={initialStock} onChangeText={setInitialStock} suffix={fa.common.kg} keyboardType="decimal-pad" />
          ) : null}
          <View style={styles.formActions}>
            <AppButton label={fa.common.cancel} variant="secondary" onPress={() => setShowForm(false)} style={styles.actionButton} />
            <AppButton label={fa.common.save} onPress={handleSave} loading={saving} style={styles.actionButton} />
          </View>
        </Card>
      ) : null}

      {materials.length === 0 && !loading ? (
        <EmptyState icon={Icons.inventory} title={fa.inventory.emptyTitle} body={fa.inventory.emptyBody} />
      ) : (
        <Card padded={false}>
          {materials.map((material) => {
            const low = material.isActive && material.currentStockGrams < material.minimumStockGrams;
            return (
              <ListRow
                key={material.id}
                icon={Icons.inventory}
                iconTint={low ? theme.warning : theme.primary}
                title={material.name}
                subtitle={`${fa.inventory.yieldPerKg}: ${yieldText(material.expectedYieldMilli)} ${fa.common.kg}`}
                value={formatKg(material.currentStockGrams)}
                trailing={
                  <Badge
                    tone={!material.isActive ? 'default' : low ? 'warning' : 'success'}
                    label={!material.isActive ? fa.inventory.inactive : low ? fa.inventory.low : fa.inventory.normal}
                  />
                }
                onPress={() => { void selectMaterial(material); }}
              />
            );
          })}
        </Card>
      )}

      {selected ? (
        <>
          <Card>
            <View style={styles.sectionHeader}>
              <View>
                <ThemedText type="subtitle">{selected.name}</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {fa.inventory.minimum}: {formatKg(selected.minimumStockGrams)}
                </ThemedText>
              </View>
              <AppButton
                label={fa.inventory.editMaterial}
                size="small"
                variant="secondary"
                onPress={() => openForm(selected)}
                style={styles.editButton}
              />
            </View>
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
              placeholder={fa.inventory.descriptionPlaceholder}
              value={adjustmentMemo}
              onChangeText={setAdjustmentMemo}
            />
            <View style={styles.formActions}>
              <AppButton
                label={selected.isActive ? fa.inventory.deactivate : fa.inventory.activate}
                variant="secondary"
                onPress={toggleActive}
                style={styles.actionButton}
              />
              <AppButton
                label={fa.inventory.saveAdjustment}
                onPress={handleAdjust}
                loading={saving}
                style={styles.actionButton}
              />
            </View>
          </Card>

          <Card>
            <ThemedText type="subtitle">{fa.inventory.history}</ThemedText>
            {movements.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">{fa.inventory.historyEmpty}</ThemedText>
            ) : movements.map((movement) => (
              <View key={movement.id} style={styles.movement}>
                <View style={styles.movementText}>
                  <ThemedText type="smallBold">
                    {movement.movementType === 'opening' ? fa.inventory.opening : fa.inventory.adjustmentType}
                  </ThemedText>
                  {movement.memo ? (
                    <ThemedText type="caption" themeColor="textSecondary">{movement.memo}</ThemedText>
                  ) : null}
                  <ThemedText type="caption" themeColor="textSecondary">
                    {formatJalaliTimestamp(movement.occurredAt)}
                  </ThemedText>
                </View>
                <View style={styles.movementValues}>
                  <ThemedText type="smallBold">{formatKg(movement.quantityGrams)}</ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary">
                    {formatKg(movement.resultingBalanceGrams)}
                  </ThemedText>
                </View>
              </View>
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  formActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionButton: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  editButton: {
    minWidth: 110,
  },
  movement: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'transparent',
    paddingVertical: Spacing.two,
  },
  movementText: {
    flex: 1,
    gap: 2,
  },
  movementValues: {
    alignItems: 'flex-end',
    gap: 2,
  },
});
