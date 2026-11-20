import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ProductPhoto } from '@/components/products/product-photo';
import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { AppTextInput } from '@/components/ui/app-text-input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { RangeSliderInput } from '@/components/ui/range-slider-input';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { StepFlow } from '@/components/ui/step-flow';
import { Radius, Spacing } from '@/constants/theme';
import { getRawMaterials } from '@/db/repositories/inventory';
import {
  DEFAULT_SLIDER_SETTINGS,
  getSliderSettings,
} from '@/db/repositories/slider-settings';
import {
  getFinishedProducts,
  postProduction,
  type ProductionInputDraft,
} from '@/db/repositories/production';
import type { FinishedProductStock, RawMaterial } from '@/db/types';
import { calculateExpectedOutputGrams, calculateProductionMetrics } from '@/domain/production';
import { parseKgInput } from '@/domain/money';
import { fa } from '@/i18n';
import { formatKg } from '@/lib/format';
import { formatJalaliISODate } from '@/lib/jalali';
import { getKabulDateISO } from '@/lib/time';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/providers/app-provider';
import { useDatabase } from '@/providers/database-provider';

type ProductionStep = 'product' | 'material' | 'quantity' | 'output' | 'review';
const PRODUCTION_STEPS: ProductionStep[] = [
  'product',
  'material',
  'quantity',
  'output',
  'review',
];

export default function ProductionFormScreen() {
  const db = useDatabase();
  const { factory } = useApp();
  const theme = useTheme();
  const [products, setProducts] = useState<FinishedProductStock[]>([]);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [productionOutputStepGrams, setProductionOutputStepGrams] = useState(
    DEFAULT_SLIDER_SETTINGS.productionOutputStepGrams
  );
  const [selectedProductId, setSelectedProductId] = useState('');
  const [input, setInput] = useState<ProductionInputDraft | null>(null);
  const [currentMaterialId, setCurrentMaterialId] = useState('');
  const [currentQuantity, setCurrentQuantity] = useState('');
  const [currentQuantityGrams, setCurrentQuantityGrams] = useState<number | null>(null);
  const [actualOutput, setActualOutput] = useState('');
  const [notes, setNotes] = useState('');
  const [step, setStep] = useState<ProductionStep>('product');
  const [productionDate] = useState(() => getKabulDateISO());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!factory) return;
    setLoading(true);
    setError(null);
    try {
      const [productRows, materialRows, sliderSettings] = await Promise.all([
        getFinishedProducts(db, factory.id),
        getRawMaterials(db, factory.id),
        getSliderSettings(db, factory.id),
      ]);
      setProducts(productRows);
      setMaterials(materialRows);
      setProductionOutputStepGrams(sliderSettings.productionOutputStepGrams);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }, [db, factory]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const selectedProduct = products.find((product) => product.id === selectedProductId);
  const currentMaterial = materials.find((material) => material.id === currentMaterialId);
  const availableMaterials = materials.filter(
    (material) => material.currentStockGrams > 0
  );
  const parsedCurrentQuantityGrams = parseKgInput(currentQuantity);
  const inputMaterial = input
    ? materials.find((material) => material.id === input.rawMaterialId)
    : undefined;
  const expectedOutputGrams = input && inputMaterial
    ? calculateExpectedOutputGrams(input.quantityGrams, inputMaterial.expectedYieldMilli)
    : 0;
  const totalInputGrams = input?.quantityGrams ?? 0;
  const parsedActualOutput = parseKgInput(actualOutput);
  const metrics = parsedActualOutput !== null && parsedActualOutput >= 0
    ? calculateProductionMetrics(totalInputGrams, expectedOutputGrams, parsedActualOutput)
    : null;

  const currentStep = PRODUCTION_STEPS.indexOf(step);
  const totalSteps = PRODUCTION_STEPS.length;
  const stepTitle = {
    product: fa.production.steps.product,
    material: fa.production.steps.material,
    quantity: fa.production.steps.quantity,
    output: fa.production.steps.output,
    review: fa.production.steps.review,
  }[step];

  const handleBack = () => {
    if (saving) return;
    setError(null);
    switch (step) {
      case 'product':
        router.back();
        return;
      case 'material':
        setStep('product');
        return;
      case 'quantity':
        setStep('material');
        return;
      case 'output':
        setStep('quantity');
        return;
      case 'review':
        setStep('output');
    }
  };

  const handleNext = async () => {
    if (saving) return;
    setError(null);
    switch (step) {
      case 'product':
        if (!selectedProduct) {
          setError(products.length > 0
            ? fa.production.productRequired
            : fa.production.noFinishedProducts);
          return;
        }
        setStep('material');
        return;
      case 'material':
        if (!currentMaterial || currentMaterial.currentStockGrams <= 0) {
          setError(availableMaterials.length > 0
            ? fa.production.materialRequired
            : fa.production.noAvailableMaterials);
          return;
        }
        setStep('quantity');
        return;
      case 'quantity':
        if (
          !currentMaterial ||
          parsedCurrentQuantityGrams === null ||
          parsedCurrentQuantityGrams <= 0
        ) {
          setError(fa.production.invalidInput);
          return;
        }
        if (parsedCurrentQuantityGrams > currentMaterial.currentStockGrams) {
          setError(fa.production.insufficientStock);
          return;
        }
        setInput({
          rawMaterialId: currentMaterial.id,
          quantityGrams: parsedCurrentQuantityGrams,
        });
        if (
          parsedActualOutput === null ||
          parsedActualOutput > parsedCurrentQuantityGrams
        ) {
          setActualOutput(String(parsedCurrentQuantityGrams / 1000));
        }
        setStep('output');
        return;
      case 'output':
        if (parsedActualOutput === null || parsedActualOutput < 0) {
          setError(fa.production.invalidOutput);
          return;
        }
        if (parsedActualOutput > totalInputGrams) {
          setError(fa.production.outputExceedsInput);
          return;
        }
        setStep('review');
        return;
      case 'review':
        await submit();
    }
  };

  const submit = async () => {
    if (!factory || !selectedProduct || saving) return;
    const outputGrams = parseKgInput(actualOutput);
    if (outputGrams === null || outputGrams < 0 || !input) {
      setError(outputGrams === null || outputGrams < 0
        ? fa.production.invalidOutput
        : fa.production.invalidInput);
      return;
    }
    if (outputGrams > input.quantityGrams) {
      setError(fa.production.outputExceedsInput);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const batch = await postProduction(db, {
        factoryId: factory.id,
        productionDate,
        finishedProductId: selectedProduct.id,
        actualOutputGrams: outputGrams,
        inputs: [input],
        notes,
      });
      router.replace({
        pathname: '/production-details',
        params: { id: batch.id, created: '1' },
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title={fa.production.newBatch} />
      {loading ? (
        <View style={styles.loading}><ActivityIndicator color={theme.primary} /></View>
      ) : null}
      {error ? (
        <Card tone="danger">
          <ThemedText type="small" style={{ color: theme.danger }}>{error}</ThemedText>
        </Card>
      ) : null}
      {!loading ? (
        <StepFlow
          currentStep={currentStep}
          totalSteps={totalSteps}
          title={stepTitle}
          backLabel={step === 'product' ? fa.common.cancel : fa.common.back}
          nextLabel={step === 'review' ? fa.production.post : fa.common.continue}
          loading={saving}
          onBack={handleBack}
          onNext={() => { void handleNext(); }}
        >
          {step === 'product' ? products.length > 0 ? (
            <View style={styles.optionList}>
              {products.map((product) => (
                <Pressable
                  key={product.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selectedProductId === product.id }}
                  onPress={() => setSelectedProductId(product.id)}
                  style={({ pressed }) => [
                    styles.option,
                    {
                      borderColor: selectedProductId === product.id ? theme.primary : theme.border,
                      backgroundColor: selectedProductId === product.id
                        ? theme.primarySoft
                        : theme.surface,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <ProductPhoto photoUri={product.photoUri} size={56} />
                  <View style={styles.optionDetails}>
                    <ThemedText type="smallBold">{product.name}</ThemedText>
                    <ThemedText type="caption" themeColor="textSecondary">
                      {fa.finishedProducts.stock}: {formatKg(product.balanceGrams)}
                    </ThemedText>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={styles.emptyStep}>
              <ThemedText type="small" themeColor="textSecondary">
                {fa.production.noFinishedProducts}
              </ThemedText>
              <AppButton
                label={fa.production.manageProducts}
                variant="secondary"
                onPress={() => router.push('/finished-products')}
              />
            </View>
          ) : null}

          {step === 'material' ? availableMaterials.length > 0 ? (
            <View style={styles.optionList}>
              {availableMaterials.map((material) => {
                const low = material.currentStockGrams < material.minimumStockGrams;
                return (
                  <Pressable
                    key={material.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: currentMaterialId === material.id }}
                    onPress={() => {
                      setCurrentMaterialId(material.id);
                      setCurrentQuantity(String(material.currentStockGrams / 1000));
                      setCurrentQuantityGrams(material.currentStockGrams);
                    }}
                    style={({ pressed }) => [
                      styles.option,
                      {
                        borderColor: currentMaterialId === material.id ? theme.primary : theme.border,
                        backgroundColor: currentMaterialId === material.id
                          ? theme.primarySoft
                          : theme.surface,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    <ProductPhoto photoUri={material.photoUri} size={56} />
                    <View style={styles.optionDetails}>
                      <ThemedText type="smallBold">{material.name}</ThemedText>
                      <ThemedText type="caption" themeColor="textSecondary">
                        {fa.production.availableStock}: {formatKg(material.currentStockGrams)}
                      </ThemedText>
                      <Badge
                        tone={low ? 'warning' : 'success'}
                        label={low ? fa.inventory.low : fa.inventory.normal}
                      />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyStep}>
              <ThemedText type="small" themeColor="textSecondary">
                {fa.production.noAvailableMaterials}
              </ThemedText>
              <AppButton
                label={fa.production.manageMaterials}
                variant="secondary"
                onPress={() => router.push('/(tabs)/inventory')}
              />
            </View>
          ) : null}

          {step === 'quantity' && currentMaterial ? (
            <View style={styles.stepContent}>
              <View style={styles.materialSummary}>
                <ProductPhoto photoUri={currentMaterial.photoUri} size={64} />
                <View style={styles.optionDetails}>
                  <ThemedText type="smallBold">{currentMaterial.name}</ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary">
                    {fa.production.availableStock}: {formatKg(currentMaterial.currentStockGrams)}
                  </ThemedText>
                </View>
              </View>
              <RangeSliderInput
                label={fa.production.quantity}
                min={0}
                max={currentMaterial.currentStockGrams}
                step={Math.min(100, currentMaterial.currentStockGrams)}
                value={currentQuantityGrams ?? currentMaterial.currentStockGrams}
                inputValue={currentQuantity}
                parseValue={parseKgInput}
                formatValue={(value) => String(value / 1000)}
                formatRangeLabel={formatKg}
                onInputValueChange={(value) => {
                  setCurrentQuantity(value);
                  const parsed = parseKgInput(value);
                  if (
                    parsed !== null &&
                    parsed >= 0 &&
                    parsed <= currentMaterial.currentStockGrams
                  ) {
                    setCurrentQuantityGrams(parsed);
                  }
                }}
                onValueChange={(value) => setCurrentQuantityGrams(value)}
                suffix={fa.common.kg}
                error={
                  parsedCurrentQuantityGrams !== null &&
                  parsedCurrentQuantityGrams > currentMaterial.currentStockGrams
                    ? fa.production.insufficientStock
                    : currentQuantity !== '' && parsedCurrentQuantityGrams === null
                      ? fa.production.invalidInput
                      : null
                }
              />
              {parsedCurrentQuantityGrams !== null &&
              parsedCurrentQuantityGrams > 0 &&
              parsedCurrentQuantityGrams <= currentMaterial.currentStockGrams ? (
                <ThemedText type="smallBold">
                  {fa.production.expectedFromMaterial}:{' '}
                  {formatKg(calculateExpectedOutputGrams(
                    parsedCurrentQuantityGrams,
                    currentMaterial.expectedYieldMilli
                  ))}
                </ThemedText>
              ) : null}
            </View>
          ) : null}

          {step === 'output' ? (
            <View style={styles.stepContent}>
              <ThemedText type="caption" themeColor="textSecondary">
                {fa.production.finishedProduct}: {selectedProduct?.name}
              </ThemedText>
              <ThemedText type="smallBold">
                {fa.production.totalInput}: {formatKg(totalInputGrams)}
              </ThemedText>
              <ThemedText type="smallBold">
                {fa.production.expectedOutput}: {formatKg(expectedOutputGrams)}
              </ThemedText>
              <RangeSliderInput
                label={fa.production.actualOutput}
                min={0}
                max={totalInputGrams}
                step={Math.min(productionOutputStepGrams, totalInputGrams)}
                value={parsedActualOutput}
                inputValue={actualOutput}
                parseValue={parseKgInput}
                formatValue={(value) => String(value / 1000)}
                formatRangeLabel={formatKg}
                onInputValueChange={setActualOutput}
                onValueChange={(value) => setActualOutput(String(value / 1000))}
                suffix={fa.common.kg}
                error={
                  parsedActualOutput !== null && parsedActualOutput > totalInputGrams
                    ? fa.production.outputExceedsInput
                    : actualOutput !== '' && parsedActualOutput === null
                      ? fa.production.invalidOutput
                      : null
                }
              />
              {metrics ? (
                <View style={styles.metrics}>
                  <View style={styles.metric}>
                    <ThemedText type="caption" themeColor="textSecondary">
                      {fa.production.expectedLoss}
                    </ThemedText>
                    <ThemedText type="smallBold">{formatKg(metrics.expectedLossGrams)}</ThemedText>
                  </View>
                  <View style={styles.metric}>
                    <ThemedText type="caption" themeColor="textSecondary">
                      {fa.production.actualLoss}
                    </ThemedText>
                    <ThemedText type="smallBold">{formatKg(metrics.actualLossGrams)}</ThemedText>
                  </View>
                  <View style={styles.metric}>
                    <ThemedText type="caption" themeColor="textSecondary">
                      {fa.production.additionalLoss}
                    </ThemedText>
                    <ThemedText type="smallBold">{formatKg(metrics.additionalLossGrams)}</ThemedText>
                  </View>
                </View>
              ) : null}
              <AppTextInput
                label={fa.production.notes}
                optional
                multiline
                value={notes}
                onChangeText={setNotes}
              />
            </View>
          ) : null}

          {step === 'review' ? (
            <View style={styles.stepContent}>
              <ThemedText type="default">
                {fa.reports.date}: {formatJalaliISODate(productionDate)}
              </ThemedText>
              <ThemedText type="default">
                {fa.production.finishedProduct}: {selectedProduct?.name}
              </ThemedText>
              {input ? (
                <ThemedText key={input.rawMaterialId} type="small">
                  {inputMaterial?.name}:{' '}
                  {formatKg(input.quantityGrams)}
                </ThemedText>
              ) : null}
              <ThemedText type="default">
                {fa.production.totalInput}: {formatKg(totalInputGrams)}
              </ThemedText>
              <ThemedText type="default">
                {fa.production.expectedOutput}: {formatKg(expectedOutputGrams)}
              </ThemedText>
              <ThemedText type="default">
                {fa.production.actualOutput}: {formatKg(parsedActualOutput ?? 0)}
              </ThemedText>
              {metrics ? (
                <>
                  <ThemedText type="default">
                    {fa.production.expectedLoss}: {formatKg(metrics.expectedLossGrams)}
                  </ThemedText>
                  <ThemedText type="default">
                    {fa.production.actualLoss}: {formatKg(metrics.actualLossGrams)}
                  </ThemedText>
                  <ThemedText type="default">
                    {fa.production.additionalLoss}: {formatKg(metrics.additionalLossGrams)}
                  </ThemedText>
                </>
              ) : null}
              {notes.trim() ? (
                <ThemedText type="caption" themeColor="textSecondary">
                  {fa.production.notes}: {notes}
                </ThemedText>
              ) : null}
            </View>
          ) : null}
        </StepFlow>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', paddingVertical: Spacing.two },
  optionList: { gap: Spacing.two },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 76,
    padding: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
  },
  optionDetails: { flex: 1, minWidth: 0, gap: Spacing.one },
  stepContent: { gap: Spacing.two },
  materialSummary: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  emptyStep: { alignItems: 'stretch', gap: Spacing.two },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  metric: { flex: 1, minWidth: 80, gap: Spacing.one },
});
