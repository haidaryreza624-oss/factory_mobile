import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ContactAvatar } from '@/components/contacts/contact-avatar';
import { CashFlowSummary } from '@/components/finance/cash-flow-summary';
import { PaymentCollectionForm } from '@/components/finance/payment-collection-form';
import { PaymentSlider } from '@/components/finance/payment-slider';
import { TransactionFilters } from '@/components/reports/transaction-filters';
import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { AppTextInput } from '@/components/ui/app-text-input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ChoiceGroup } from '@/components/ui/choice-group';
import { EmptyState } from '@/components/ui/empty-state';
import { RangeSliderInput } from '@/components/ui/range-slider-input';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { StepFlow } from '@/components/ui/step-flow';
import { Icons } from '@/constants/icons';
import { Spacing } from '@/constants/theme';
import { getRawMaterials } from '@/db/repositories/inventory';
import {
  getPurchaseCashTotals,
  getPurchases,
  recordPurchasePayment,
  getSuppliers,
  postPurchase,
} from '@/db/repositories/purchases';
import { getRateForDate } from '@/db/repositories/rates';
import {
  DEFAULT_SLIDER_SETTINGS,
  getSliderSettings,
  getUnitPriceSliderRange,
} from '@/db/repositories/slider-settings';
import type { CashFlowTotals, Purchase, RawMaterial, Supplier } from '@/db/types';
import {
  moneyMinorToInput,
  parseAfnInput,
  parseKgInput,
  parseUsdInput,
  type Currency,
} from '@/domain/money';
import { calculatePurchaseLineMinor } from '@/domain/purchases';
import { fa } from '@/i18n';
import { formatKg, formatMoney } from '@/lib/format';
import { formatJalaliISODate } from '@/lib/jalali';
import { getKabulDateISO } from '@/lib/time';
import { toPersianDigits } from '@/lib/persian';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/providers/app-provider';
import { useDatabase } from '@/providers/database-provider';

interface DraftItem {
  rawMaterialId: string;
  quantity: string;
  unitPrice: string;
}

export default function PurchasesScreen() {
  const db = useDatabase();
  const { factory } = useApp();
  const theme = useTheme();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [transactionSearch, setTransactionSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'complete' | 'incomplete'>('all');
  const [currencyFilter, setCurrencyFilter] = useState<'all' | 'AFN' | 'USD'>('all');
  const [cashTotals, setCashTotals] = useState<CashFlowTotals>({ afn: 0 });
  const [dailyRateMilli, setDailyRateMilli] = useState<number | null>(null);
  const [sliderSettings, setSliderSettings] = useState(DEFAULT_SLIDER_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);
  const [purchaseStep, setPurchaseStep] = useState(0);
  const [purchaseItemIndex, setPurchaseItemIndex] = useState(0);
  const [supplierId, setSupplierId] = useState('');
  const [currency, setCurrency] = useState<Currency>('AFN');
  const [paidAmountMinor, setPaidAmountMinor] = useState<number | null>(null);
  const [paidAmountInput, setPaidAmountInput] = useState<string | null>(null);
  const [payingPurchaseId, setPayingPurchaseId] = useState<string | null>(null);
  const [additionalPaymentAmountMinor, setAdditionalPaymentAmountMinor] = useState(0);
  const [additionalPaymentAmountInput, setAdditionalPaymentAmountInput] = useState<string | null>(null);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<DraftItem[]>([
    { rawMaterialId: '', quantity: '', unitPrice: '' },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!factory) return;
    try {
      setError(null);
      const [
        supplierRows,
        materialRows,
        purchaseRows,
        purchaseCashTotals,
        dailyRate,
        loadedSliderSettings,
      ] = await Promise.all([
        getSuppliers(db, factory.id),
        getRawMaterials(db, factory.id),
        getPurchases(db, factory.id),
        getPurchaseCashTotals(db, factory.id),
        getRateForDate(db, factory.id, getKabulDateISO(new Date())),
        getSliderSettings(db, factory.id),
      ]);
      setSuppliers(supplierRows);
      setMaterials(materialRows);
      setPurchases(purchaseRows);
      setCashTotals(purchaseCashTotals);
      setDailyRateMilli(dailyRate?.rateMilli ?? null);
      setSliderSettings(loadedSliderSettings);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }, [db, factory]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const filteredPurchases = useMemo(() => {
    const query = transactionSearch.trim().toLocaleLowerCase();
    return purchases.filter((purchase) => {
      const statusMatches = statusFilter === 'all' ||
        (statusFilter === 'complete'
          ? purchase.paymentStatus === 'paid'
          : purchase.paymentStatus !== 'paid');
      const currencyMatches = currencyFilter === 'all' ||
        purchase.currency === currencyFilter;
      const searchMatches = !query || [
        purchase.supplierName,
        ...purchase.items.map((item) => item.rawMaterialName),
        purchase.reference ?? '',
        purchase.notes ?? '',
        purchase.purchaseDate,
        formatJalaliISODate(purchase.purchaseDate),
      ].some((value) => value.toLocaleLowerCase().includes(query));
      return statusMatches && currencyMatches && searchMatches;
    });
  }, [currencyFilter, purchases, statusFilter, transactionSearch]);

  const currentItem = items[purchaseItemIndex] ?? {
    rawMaterialId: '',
    quantity: '',
    unitPrice: '',
  };
  const currentMaterialId =
    currentItem.rawMaterialId || (materials.length === 1 ? materials[0].id : '');
  const currentMaterial = materials.find((material) => material.id === currentMaterialId);
  const currentQuantityGrams = parseKgInput(currentItem.quantity);
  const currentUnitPriceMinor = currency === 'AFN'
    ? parseAfnInput(currentItem.unitPrice)
    : parseUsdInput(currentItem.unitPrice);
  const currentPriceRange = getUnitPriceSliderRange(
    sliderSettings,
    'purchase',
    currency
  );
  const currentUnitPriceInRange =
    currentUnitPriceMinor !== null &&
    currentUnitPriceMinor >= currentPriceRange.min &&
    currentUnitPriceMinor <= currentPriceRange.max;
  const currentLineTotalMinor =
    currentQuantityGrams !== null && currentQuantityGrams > 0 &&
    currentUnitPriceInRange
      ? calculatePurchaseLineMinor(currentQuantityGrams, currentUnitPriceMinor)
      : null;
  const purchaseTotalMinor = items.reduce((total, item) => {
    const quantity = parseKgInput(item.quantity);
    const unitPrice = currency === 'AFN'
      ? parseAfnInput(item.unitPrice)
      : parseUsdInput(item.unitPrice);
    return quantity !== null && quantity > 0 && unitPrice !== null && unitPrice >= 0
      && unitPrice >= currentPriceRange.min && unitPrice <= currentPriceRange.max
      ? total + calculatePurchaseLineMinor(quantity, unitPrice)
      : total;
  }, 0);
  const enteredPaidMinor = paidAmountMinor ?? purchaseTotalMinor;

  const openPurchase = () => {
    setError(null);
    setSuccess(null);
    setCurrency('AFN');
    setSupplierId('');
    setItems([{ rawMaterialId: '', quantity: '', unitPrice: '' }]);
    setPurchaseItemIndex(0);
    setPurchaseStep(0);
    setPaidAmountMinor(null);
    setPaidAmountInput(null);
    setReference('');
    setNotes('');
    setShowPurchase(true);
  };

  const openSupplierForm = () => {
    setError(null);
    router.push('/supplier-form');
  };

  const updateItem = (index: number, patch: Partial<DraftItem>) => {
    setItems((current) =>
      current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)
    );
  };

  const submitPurchase = async () => {
    if (!factory || saving) return;
    setError(null);

    if (!supplierId) {
      setError(fa.purchases.supplierRequired);
      return;
    }

    const parsedItems = [];
    for (const item of items) {
      const rawMaterialId =
        item.rawMaterialId || (materials.length === 1 ? materials[0].id : '');
      const quantity = parseKgInput(item.quantity);
      const unitPrice = currency === 'AFN'
        ? parseAfnInput(item.unitPrice)
        : parseUsdInput(item.unitPrice);
      if (!rawMaterialId || quantity === null || quantity <= 0 ||
          unitPrice === null || unitPrice < 0) {
        setError(fa.purchases.invalidItem);
        return;
      }
      if (unitPrice < currentPriceRange.min || unitPrice > currentPriceRange.max) {
        setError(fa.sliderSettings.priceOutOfRange);
        return;
      }
      parsedItems.push({
        rawMaterialId,
        quantityGrams: quantity,
        unitPriceMinor: unitPrice,
      });
    }

    const paidMinor = paidAmountInput === null
      ? enteredPaidMinor
      : currency === 'AFN'
        ? parseAfnInput(paidAmountInput)
        : parseUsdInput(paidAmountInput);
    if (paidMinor === null || paidMinor < 0) {
      setError(fa.purchases.invalidPayment);
      return;
    }
    if (paidMinor > purchaseTotalMinor) {
      setError(fa.purchases.paidAmountTooHigh);
      return;
    }

    setSaving(true);
    try {
      await postPurchase(db, {
        factoryId: factory.id,
        supplierId,
        purchaseDate: getKabulDateISO(),
        currency,
        items: parsedItems,
        paidMinor,
        reference,
        notes,
      });
      setShowPurchase(false);
      setSupplierId('');
      setPaidAmountMinor(null);
      setPaidAmountInput(null);
      setReference('');
      setNotes('');
      setItems([{ rawMaterialId: '', quantity: '', unitPrice: '' }]);
      setPurchaseItemIndex(0);
      setPurchaseStep(0);
      setSuccess(fa.purchases.posted);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  };

  const handlePurchaseBack = () => {
    setError(null);
    if (purchaseStep === 0) {
      setShowPurchase(false);
      return;
    }
    if (purchaseStep === 2 && purchaseItemIndex > 0) {
      setPurchaseItemIndex((current) => current - 1);
      setPurchaseStep(3);
      return;
    }
    if (purchaseStep === 3) {
      setPurchaseStep(2);
      return;
    }
    if (purchaseStep === 4) {
      setPurchaseItemIndex(Math.max(0, items.length - 1));
      setPurchaseStep(3);
      return;
    }
    if (purchaseStep === 5) {
      setPurchaseStep(4);
      return;
    }
    setPurchaseStep((current) => current - 1);
  };

  const handlePurchaseNext = async () => {
    setError(null);
    if (purchaseStep === 0) {
      setPurchaseStep(1);
      return;
    }
    if (purchaseStep === 1) {
      if (!supplierId) {
        setError(fa.purchases.supplierRequired);
        return;
      }
      setPurchaseStep(2);
      return;
    }
    if (purchaseStep === 2) {
      if (!currentMaterialId) {
        setError(materials.length === 0 ? fa.purchases.noMaterials : fa.purchases.materialRequired);
        return;
      }
      updateItem(purchaseItemIndex, {
        rawMaterialId: currentMaterialId,
        unitPrice: currentItem.unitPrice || moneyMinorToInput(currentPriceRange.max, currency),
      });
      setPurchaseStep(3);
      return;
    }
    if (purchaseStep === 3) {
      if (currentQuantityGrams === null || currentQuantityGrams <= 0) {
        setError(fa.purchases.invalidItem);
        return;
      }
      if (!currentUnitPriceInRange) {
        setError(fa.sliderSettings.priceOutOfRange);
        return;
      }
      setPurchaseStep(4);
      return;
    }
    if (purchaseStep === 4) {
      const paidMinor = paidAmountInput === null
        ? enteredPaidMinor
        : currency === 'AFN'
          ? parseAfnInput(paidAmountInput)
          : parseUsdInput(paidAmountInput);
      if (paidMinor === null || paidMinor < 0) {
        setError(fa.purchases.invalidPayment);
        return;
      }
      if (paidMinor > purchaseTotalMinor) {
        setError(fa.purchases.paidAmountTooHigh);
        return;
      }
      setPurchaseStep(5);
      return;
    }
    await submitPurchase();
  };

  const addPurchaseItem = () => {
    if (!currentMaterialId || currentQuantityGrams === null || currentQuantityGrams <= 0) {
      setError(fa.purchases.invalidItem);
      return;
    }
    if (!currentUnitPriceInRange) {
      setError(fa.sliderSettings.priceOutOfRange);
      return;
    }
    updateItem(purchaseItemIndex, { rawMaterialId: currentMaterialId });
    setItems((current) => [
      ...current,
      { rawMaterialId: '', quantity: '', unitPrice: '' },
    ]);
    setPurchaseItemIndex(items.length);
    setPurchaseStep(2);
    setPaidAmountMinor(null);
    setPaidAmountInput(null);
    setError(null);
  };

  const removePurchaseItem = () => {
    if (items.length <= 1) return;
    const remaining = items.filter((_, index) => index !== purchaseItemIndex);
    setItems(remaining);
    setPurchaseItemIndex(Math.min(purchaseItemIndex, remaining.length - 1));
    setPurchaseStep(2);
    setPaidAmountMinor(null);
    setPaidAmountInput(null);
    setError(null);
  };

  const submitAdditionalPayment = async () => {
    if (!factory || !payingPurchaseId || saving) return;
    const purchase = purchases.find((item) => item.id === payingPurchaseId);
    if (!purchase) {
      setError(fa.purchases.purchaseNotFound);
      return;
    }

    const amountMinor = additionalPaymentAmountInput === null
      ? additionalPaymentAmountMinor
      : purchase.currency === 'AFN'
        ? parseAfnInput(additionalPaymentAmountInput)
        : parseUsdInput(additionalPaymentAmountInput);
    if (amountMinor === null || amountMinor <= 0) {
      setError(fa.purchases.invalidPayment);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await recordPurchasePayment(db, {
        factoryId: factory.id,
        purchaseId: payingPurchaseId,
        amountMinor,
      });
      setPayingPurchaseId(null);
      setAdditionalPaymentAmountMinor(0);
      setAdditionalPaymentAmountInput(null);
      setSuccess(fa.purchases.paymentRecorded);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  };

  const statusTone = (status: Purchase['paymentStatus']) =>
    status === 'paid' ? 'success' : status === 'partial' ? 'warning' : 'danger';
  const statusLabel = (status: Purchase['paymentStatus']) =>
    status === 'paid' ? fa.purchases.paid : status === 'partial' ? fa.purchases.partial : fa.purchases.unpaid;
  const purchaseProgressStep =
    purchaseStep === 0 || purchaseStep === 1
      ? purchaseStep
      : purchaseStep === 2
        ? 2 + purchaseItemIndex * 2
        : purchaseStep === 3
          ? 3 + purchaseItemIndex * 2
          : purchaseStep === 4
            ? 2 + items.length * 2
            : 3 + items.length * 2;
  const purchaseStepTitle = purchaseStep === 2 && purchaseItemIndex > 0
    ? `${fa.purchases.steps.material} ${toPersianDigits(purchaseItemIndex + 1)}`
    : purchaseStep === 3 && purchaseItemIndex > 0
      ? `${fa.purchases.steps.details} ${toPersianDigits(purchaseItemIndex + 1)}`
      : [
          fa.purchases.steps.currency,
          fa.purchases.steps.supplier,
          fa.purchases.steps.material,
          fa.purchases.steps.details,
          fa.purchases.steps.payment,
          fa.purchases.steps.review,
        ][purchaseStep];

  return (
    <Screen>
      {showPurchase ? (
        <>
          <ScreenHeader title={fa.purchases.newPurchase} />
          {error ? (
            <Card tone="danger">
              <ThemedText type="small" style={{ color: theme.danger }}>{error}</ThemedText>
            </Card>
          ) : null}
          <StepFlow
            currentStep={purchaseProgressStep}
            totalSteps={4 + items.length * 2}
            title={purchaseStepTitle}
            backLabel={purchaseStep === 0 ? fa.common.cancel : fa.common.back}
            nextLabel={purchaseStep === 5 ? fa.purchases.post : fa.common.continue}
            loading={saving}
            onBack={handlePurchaseBack}
            onNext={() => { void handlePurchaseNext(); }}
          >
            {purchaseStep === 0 ? (
              <ChoiceGroup
                label={fa.purchases.currency}
                options={[
                  { id: 'AFN', label: fa.units.afn },
                  { id: 'USD', label: fa.units.usd },
                ]}
                value={currency}
                onChange={(nextCurrency) => {
                  if (nextCurrency !== currency) {
                    setItems((current) =>
                      current.map((item) => ({ ...item, unitPrice: '' }))
                    );
                    setPaidAmountMinor(null);
                    setPaidAmountInput(null);
                  }
                  setCurrency(nextCurrency);
                }}
              />
            ) : null}

            {purchaseStep === 1 ? (
              <View style={styles.stepContent}>
                {suppliers.length === 0 ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {fa.purchases.noSuppliers}
                  </ThemedText>
                ) : (
                  <ChoiceGroup
                    label={fa.purchases.supplier}
                    searchable
                    options={suppliers.map((supplier) => ({
                      id: supplier.id,
                      label: supplier.name,
                      leading: (
                        <ContactAvatar
                          name={supplier.name}
                          photoUri={supplier.photoUri}
                          size={30}
                        />
                      ),
                    }))}
                    value={supplierId}
                    onChange={setSupplierId}
                  />
                )}
                <AppButton
                  label={fa.purchases.addSupplier}
                  variant="secondary"
                  onPress={openSupplierForm}
                />
              </View>
            ) : null}

            {purchaseStep === 2 ? materials.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">{fa.purchases.noMaterials}</ThemedText>
            ) : materials.length === 1 ? (
              <View style={styles.materialSummary}>
                <ThemedText type="smallBold">{materials[0].name}</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {fa.inventory.stock}: {formatKg(materials[0].currentStockGrams)}
                </ThemedText>
              </View>
            ) : (
              <ChoiceGroup
                label={fa.purchases.material}
                options={materials.map((material) => ({
                  id: material.id,
                  label: material.name,
                  description: `${fa.inventory.stock}: ${formatKg(material.currentStockGrams)}`,
                }))}
                value={currentMaterialId}
                onChange={(rawMaterialId) => {
                  updateItem(
                    purchaseItemIndex,
                    rawMaterialId === currentMaterialId
                      ? { rawMaterialId }
                      : { rawMaterialId, quantity: '', unitPrice: '' }
                  );
                  if (rawMaterialId !== currentMaterialId) {
                    setPaidAmountMinor(null);
                    setPaidAmountInput(null);
                  }
                }}
              />
            ) : null}

            {purchaseStep === 3 ? (
              <View style={styles.stepContent}>
                {currentMaterial ? (
                  <ThemedText type="smallBold">{currentMaterial.name}</ThemedText>
                ) : null}
                <AppTextInput
                  label={fa.purchases.quantity}
                  value={currentItem.quantity}
                  onChangeText={(value) => {
                    updateItem(purchaseItemIndex, { quantity: value });
                    setPaidAmountMinor(null);
                    setPaidAmountInput(null);
                  }}
                  suffix={fa.common.kg}
                  keyboardType="decimal-pad"
                />
                <RangeSliderInput
                  label={fa.purchases.unitPrice}
                  min={currentPriceRange.min}
                  max={currentPriceRange.max}
                  step={Math.min(
                    currentPriceRange.step,
                    currentPriceRange.max - currentPriceRange.min
                  )}
                  value={currentUnitPriceMinor}
                  inputValue={
                    currentItem.unitPrice ||
                    moneyMinorToInput(currentPriceRange.max, currency)
                  }
                  parseValue={(value) => currency === 'AFN'
                    ? parseAfnInput(value)
                    : parseUsdInput(value)}
                  formatValue={(value) => moneyMinorToInput(value, currency)}
                  formatRangeLabel={(value) =>
                    `${formatMoney(value, currency)} / ${fa.common.kg}`
                  }
                  onInputValueChange={(value) => {
                    updateItem(purchaseItemIndex, { unitPrice: value });
                    setPaidAmountMinor(null);
                    setPaidAmountInput(null);
                  }}
                  onValueChange={() => {}}
                  suffix={currency === 'AFN' ? fa.units.afn : fa.units.usd}
                  error={
                    currentUnitPriceMinor !== null && !currentUnitPriceInRange
                      ? fa.sliderSettings.priceOutOfRange
                      : null
                  }
                />
                {currentLineTotalMinor !== null ? (
                  <ThemedText type="smallBold">
                    {fa.purchases.total}: {formatMoney(currentLineTotalMinor, currency)}
                  </ThemedText>
                ) : null}
                {items.length > 1 ? (
                  <AppButton
                    label={fa.purchases.removeItem}
                    size="small"
                    variant="ghost"
                    onPress={removePurchaseItem}
                  />
                ) : null}
                <AppButton
                  label={fa.purchases.addItem}
                  variant="secondary"
                  onPress={addPurchaseItem}
                />
              </View>
            ) : null}

            {purchaseStep === 4 ? (
              <View style={styles.stepContent}>
                <PaymentSlider
                  totalMinor={purchaseTotalMinor}
                  paidMinor={enteredPaidMinor}
                  step={1}
                  currency={currency}
                  rateMilli={dailyRateMilli}
                  rateMissingLabel={fa.common.dailyRateUnavailable}
                  paidLabel={fa.purchases.paidAmount}
                  remainingLabel={fa.common.loanBalance}
                  invalidAmountMessage={fa.purchases.invalidPayment}
                  amountInput={paidAmountInput}
                  onAmountInputChange={setPaidAmountInput}
                  onChange={(amountMinor) => {
                    setPaidAmountMinor(
                      amountMinor >= purchaseTotalMinor ? null : amountMinor
                    );
                  }}
                  onSliderChange={(amountMinor, amountInput) => {
                    setPaidAmountMinor(
                      amountMinor >= purchaseTotalMinor ? null : amountMinor
                    );
                    setPaidAmountInput(amountInput);
                  }}
                />
                <ThemedText type="caption" themeColor="textSecondary">
                  {fa.purchases.unpaidBalanceHint}
                </ThemedText>
                <AppTextInput label={fa.purchases.reference} optional value={reference} onChangeText={setReference} />
                <AppTextInput label={fa.purchases.notes} optional multiline value={notes} onChangeText={setNotes} />
              </View>
            ) : null}

            {purchaseStep === 5 ? (
              <View style={styles.review}>
                <ThemedText type="default">
                  {fa.purchases.supplier}: {suppliers.find((supplier) => supplier.id === supplierId)?.name}
                </ThemedText>
                <ThemedText type="default">
                  {fa.purchases.currency}: {currency === 'AFN' ? fa.units.afn : fa.units.usd}
                </ThemedText>
                {items.map((item, index) => {
                  const material = materials.find((row) => row.id === item.rawMaterialId);
                  const quantity = parseKgInput(item.quantity) ?? 0;
                  const unitPrice = currency === 'AFN'
                    ? parseAfnInput(item.unitPrice) ?? 0
                    : parseUsdInput(item.unitPrice) ?? 0;
                  return (
                    <View key={`${item.rawMaterialId}-${index}`} style={styles.reviewItem}>
                      <ThemedText type="smallBold">{material?.name}</ThemedText>
                      <ThemedText type="caption" themeColor="textSecondary">
                        {formatKg(quantity)} × {formatMoney(unitPrice, currency)} {fa.common.perKg}
                      </ThemedText>
                      <ThemedText type="caption" themeColor="textSecondary">
                        {fa.purchases.total}: {formatMoney(calculatePurchaseLineMinor(quantity, unitPrice), currency)}
                      </ThemedText>
                    </View>
                  );
                })}
                <ThemedText type="default">
                  {fa.purchases.total}: {formatMoney(purchaseTotalMinor, currency)}
                </ThemedText>
                <ThemedText type="default">
                  {fa.purchases.paidAmount}: {formatMoney(enteredPaidMinor ?? 0, currency)}
                </ThemedText>
                <ThemedText type="default">
                  {fa.purchases.outstanding}:{' '}
                  {formatMoney(Math.max(0, purchaseTotalMinor - (enteredPaidMinor ?? 0)), currency)}
                </ThemedText>
                {reference.trim() ? (
                  <ThemedText type="caption" themeColor="textSecondary">{fa.purchases.reference}: {reference}</ThemedText>
                ) : null}
                {notes.trim() ? (
                  <ThemedText type="caption" themeColor="textSecondary">{fa.purchases.notes}: {notes}</ThemedText>
                ) : null}
              </View>
            ) : null}
          </StepFlow>
        </>
      ) : (
        <>
          <ScreenHeader
            title={fa.purchases.title}
            subtitle={fa.purchases.subtitle}
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

          <CashFlowSummary
            title={fa.purchases.cashTitle}
            description={fa.purchases.cashSummary}
            totalLabel={fa.purchases.cashTotal}
            totals={cashTotals}
          />

          <View style={styles.actions}>
            <AppButton
              label={fa.contacts.manageSuppliers}
              variant="secondary"
              onPress={() => router.push('/suppliers')}
              style={styles.action}
            />
            <AppButton
              label={fa.purchases.newPurchase}
              onPress={openPurchase}
              style={styles.action}
            />
          </View>
          <TransactionFilters
            search={transactionSearch}
            status={statusFilter}
            currency={currencyFilter}
            onSearchChange={setTransactionSearch}
            onStatusChange={setStatusFilter}
            onCurrencyChange={setCurrencyFilter}
          />
          <ThemedText type="subtitle">{fa.purchases.history}</ThemedText>
          {purchases.length === 0 && !loading ? (
            <EmptyState icon={Icons.cart} title={fa.purchases.empty} body="" />
          ) : purchases.length > 0 && filteredPurchases.length === 0 ? (
            <EmptyState
              icon={Icons.cart}
              title={fa.reports.noMatchingTransactions}
              body=""
            />
          ) : (
            <Card padded={false}>
              {filteredPurchases.map((purchase, index) => (
                <View key={purchase.id}>
                  <View style={styles.purchaseRow}>
                    <View style={styles.purchaseText}>
                      <View style={styles.contactHeading}>
                        <ContactAvatar
                          name={purchase.supplierName}
                          photoUri={
                            suppliers.find((supplier) => supplier.id === purchase.supplierId)
                              ?.photoUri ?? null
                          }
                          size={38}
                        />
                        <ThemedText type="default">{purchase.supplierName}</ThemedText>
                      </View>
                      <ThemedText type="caption" themeColor="textSecondary">
                        {formatJalaliISODate(purchase.purchaseDate)} · {purchase.items.map((item) => item.rawMaterialName).join('، ')}
                      </ThemedText>
                      <ThemedText type="caption" themeColor="textSecondary">
                        {fa.purchases.outstanding}: {formatMoney(purchase.outstandingOriginalMinor, purchase.currency)}
                      </ThemedText>
                      {purchase.payments.length > 0 ? (
                        <ThemedText type="caption" themeColor="textSecondary">
                          {fa.purchases.paymentHistory}:{' '}
                          {purchase.payments.map((payment) =>
                            formatMoney(payment.amountMinor, payment.currency)
                          ).join(' · ')}
                        </ThemedText>
                      ) : null}
                    </View>
                    <View style={styles.purchaseValue}>
                      <ThemedText type="smallBold">
                        {formatMoney(purchase.totalOriginalMinor, purchase.currency)}
                      </ThemedText>
                      <Badge tone={statusTone(purchase.paymentStatus)} label={statusLabel(purchase.paymentStatus)} />
                    </View>
                  </View>
                  {purchase.outstandingOriginalMinor > 0 ? (
                    <AppButton
                      label={fa.purchases.addPayment}
                      variant="primary"
                      onPress={() => {
                        setError(null);
                        setSuccess(null);
                        setPayingPurchaseId(purchase.id);
                        setAdditionalPaymentAmountMinor(purchase.outstandingOriginalMinor);
                        setAdditionalPaymentAmountInput(null);
                      }}
                      style={styles.paymentAction}
                    />
                  ) : null}
                  {payingPurchaseId === purchase.id ? (
                    <PaymentCollectionForm
                      title={fa.purchases.addPayment}
                      outstandingLabel={fa.purchases.outstanding}
                      outstandingOriginalMinor={purchase.outstandingOriginalMinor}
                      currencyLabel={fa.purchases.currency}
                      amountLabel={fa.purchases.paymentAmount}
                      invalidAmountMessage={fa.purchases.invalidPayment}
                      saveLabel={fa.purchases.addPayment}
                      amountMinor={additionalPaymentAmountMinor}
                      amountInput={additionalPaymentAmountInput}
                      step={1}
                      currency={purchase.currency}
                      rateMilli={dailyRateMilli}
                      saving={saving}
                      onAmountInputChange={setAdditionalPaymentAmountInput}
                      onAmountChange={setAdditionalPaymentAmountMinor}
                      onSliderChange={(amountMinor, amountInput) => {
                        setAdditionalPaymentAmountMinor(amountMinor);
                        setAdditionalPaymentAmountInput(amountInput);
                      }}
                      onSave={submitAdditionalPayment}
                      onCancel={() => setPayingPurchaseId(null)}
                    />
                  ) : null}
                  {index < filteredPurchases.length - 1 ? (
                    <View style={[styles.recordSeparator, { backgroundColor: theme.border }]} />
                  ) : null}
                </View>
              ))}
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', paddingVertical: Spacing.two },
  actions: { flexDirection: 'row', gap: Spacing.two },
  action: { flex: 1 },
  stepContent: { gap: Spacing.three },
  review: { gap: Spacing.two },
  reviewItem: { gap: Spacing.one },
  materialSummary: { gap: Spacing.one },
  purchaseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  purchaseText: { flex: 1, gap: 2 },
  contactHeading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  purchaseValue: { alignItems: 'flex-end', gap: Spacing.one },
  paymentAction: { marginHorizontal: Spacing.three, marginBottom: Spacing.three },
  recordSeparator: { height: StyleSheet.hairlineWidth },
});
