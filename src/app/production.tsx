import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { AppTextInput } from '@/components/ui/app-text-input';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Icons } from '@/constants/icons';
import { Radius, Spacing } from '@/constants/theme';
import { getRawMaterials } from '@/db/repositories/inventory';
import {
  getFinishedProductBalance,
  getProductionBatches,
  postProduction,
} from '@/db/repositories/production';
import type { ProductionBatch, RawMaterial } from '@/db/types';
import { parseKgInput } from '@/domain/money';
import { fa } from '@/i18n';
import { formatAfn, formatKg } from '@/lib/format';
import { formatJalaliISODate } from '@/lib/jalali';
import { getKabulDateISO } from '@/lib/time';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/providers/app-provider';
import { useDatabase } from '@/providers/database-provider';

interface DraftInput {
  rawMaterialId: string;
  quantity: string;
}

export default function ProductionScreen() {
  const db = useDatabase();
  const { factory } = useApp();
  const theme = useTheme();

  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [finishedBalance, setFinishedBalance] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [inputs, setInputs] = useState<DraftInput[]>([
    { rawMaterialId: '', quantity: '' },
  ]);
  const [actualOutput, setActualOutput] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!factory) return;
    try {
      setError(null);
      const [materialRows, batchRows, balance] = await Promise.all([
        getRawMaterials(db, factory.id),
        getProductionBatches(db, factory.id),
        getFinishedProductBalance(db, factory.id),
      ]);
      setMaterials(materialRows);
      setBatches(batchRows);
      setFinishedBalance(balance);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }, [db, factory]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const updateInput = (index: number, patch: Partial<DraftInput>) => {
    setInputs((current) =>
      current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)
    );
  };

  const submit = async () => {
    if (!factory || saving) return;
    setError(null);

    const parsedOutput = parseKgInput(actualOutput);
    if (parsedOutput === null || parsedOutput < 0) {
      setError(fa.production.invalidOutput);
      return;
    }

    const parsedInputs = [];
    for (const input of inputs) {
      const quantity = parseKgInput(input.quantity);
      if (!input.rawMaterialId || quantity === null || quantity <= 0) {
        setError(fa.production.invalidInput);
        return;
      }
      parsedInputs.push({
        rawMaterialId: input.rawMaterialId,
        quantityGrams: quantity,
      });
    }

    setSaving(true);
    try {
      await postProduction(db, {
        factoryId: factory.id,
        productionDate: getKabulDateISO(),
        actualOutputGrams: parsedOutput,
        inputs: parsedInputs,
        notes,
      });
      setShowForm(false);
      setInputs([{ rawMaterialId: '', quantity: '' }]);
      setActualOutput('');
      setNotes('');
      setSuccess(fa.production.posted);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  };

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
        <Card tone="danger"><ThemedText type="small" style={{ color: theme.danger }}>{error}</ThemedText></Card>
      ) : null}
      {success ? (
        <Card tone="success"><ThemedText type="small" style={{ color: theme.success }}>{success}</ThemedText></Card>
      ) : null}

      <Card>
        <ThemedText type="caption" themeColor="textSecondary">
          {fa.production.finishedBalance}
        </ThemedText>
        <ThemedText type="number">{formatKg(finishedBalance)}</ThemedText>
      </Card>

      <AppButton
        label={fa.production.newBatch}
        onPress={() => { setShowForm((value) => !value); setError(null); setSuccess(null); }}
      />

      {showForm ? (
        <Card>
          <ThemedText type="subtitle">{fa.production.newBatch}</ThemedText>

          {materials.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              {fa.production.noMaterials}
            </ThemedText>
          ) : null}

          {inputs.map((input, index) => (
            <Card key={index} tone="default" style={styles.inputCard}>
              <View style={styles.field}>
                <ThemedText type="label">{fa.production.material}</ThemedText>
                <View style={styles.optionRow}>
                  {materials.map((material) => (
                    <Pressable
                      key={material.id}
                      accessibilityRole="button"
                      onPress={() => updateInput(index, { rawMaterialId: material.id })}
                      style={[
                        styles.option,
                        {
                          backgroundColor: input.rawMaterialId === material.id
                            ? theme.primarySoft
                            : theme.surfaceMuted,
                          borderColor: input.rawMaterialId === material.id
                            ? theme.primary
                            : theme.border,
                        },
                      ]}>
                      <ThemedText type="smallBold">{material.name}</ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
              <AppTextInput
                label={fa.production.quantity}
                value={input.quantity}
                onChangeText={(value) => updateInput(index, { quantity: value })}
                suffix={fa.common.kg}
                keyboardType="decimal-pad"
              />
              {inputs.length > 1 ? (
                <AppButton
                  label={fa.common.close}
                  size="small"
                  variant="ghost"
                  onPress={() => setInputs((current) =>
                    current.filter((_, itemIndex) => itemIndex !== index)
                  )}
                />
              ) : null}
            </Card>
          ))}

          <AppButton
            label={fa.production.addMaterial}
            variant="secondary"
            onPress={() => setInputs((current) =>
              [...current, { rawMaterialId: '', quantity: '' }]
            )}
          />

          <AppTextInput
            label={fa.production.actualOutput}
            value={actualOutput}
            onChangeText={setActualOutput}
            suffix={fa.common.kg}
            keyboardType="decimal-pad"
          />
          <AppTextInput
            label={fa.production.notes}
            value={notes}
            onChangeText={setNotes}
          />

          <View style={styles.formActions}>
            <AppButton
              label={fa.common.cancel}
              variant="secondary"
              onPress={() => setShowForm(false)}
              style={styles.action}
            />
            <AppButton
              label={fa.production.post}
              onPress={submit}
              loading={saving}
              style={styles.action}
            />
          </View>
        </Card>
      ) : null}

      <ThemedText type="subtitle">{fa.production.history}</ThemedText>
      {batches.length === 0 && !loading ? (
        <EmptyState icon={Icons.operations} title={fa.production.empty} body="" />
      ) : (
        batches.map((batch) => (
          <Card key={batch.id}>
            <View style={styles.batchHeader}>
              <ThemedText type="subtitle">
                {formatJalaliISODate(batch.productionDate)}
              </ThemedText>
              <ThemedText type="smallBold">
                {formatKg(batch.actualOutputGrams)}
              </ThemedText>
            </View>

            {batch.inputs.map((input) => (
              <ThemedText key={input.id} type="caption" themeColor="textSecondary">
                {input.rawMaterialName}: {formatKg(input.quantityGrams)}
              </ThemedText>
            ))}

            <View style={styles.metrics}>
              <View style={styles.metric}>
                <ThemedText type="caption" themeColor="textSecondary">
                  {fa.production.expectedOutput}
                </ThemedText>
                <ThemedText type="smallBold">
                  {formatKg(batch.expectedOutputGrams)}
                </ThemedText>
              </View>
              <View style={styles.metric}>
                <ThemedText type="caption" themeColor="textSecondary">
                  {fa.production.actualLoss}
                </ThemedText>
                <ThemedText type="smallBold">
                  {formatKg(batch.actualLossGrams)}
                </ThemedText>
              </View>
              <View style={styles.metric}>
                <ThemedText type="caption" themeColor="textSecondary">
                  {fa.production.additionalLoss}
                </ThemedText>
                <ThemedText type="smallBold">
                  {formatKg(batch.additionalLossGrams)}
                </ThemedText>
              </View>
            </View>

            <View style={styles.costRow}>
              <ThemedText type="caption" themeColor="textSecondary">
                {fa.production.costPerKg}
              </ThemedText>
              <ThemedText type="smallBold">
                {formatAfn(batch.costPerKgAfn)}
              </ThemedText>
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', paddingVertical: Spacing.two },
  formActions: { flexDirection: 'row', gap: Spacing.two },
  action: { flex: 1 },
  field: { gap: Spacing.two },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  option: {
    minHeight: 40,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputCard: { borderWidth: StyleSheet.hairlineWidth },
  batchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  metric: {
    flex: 1,
    minWidth: 100,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
