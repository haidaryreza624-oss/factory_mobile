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
import {
  getFinishedProductBalance,
  getFinishedProducts,
} from '@/db/repositories/production';
import {
  getCustomers,
  getSales,
  getSalesCashTotals,
  postSale,
  recordSalePayment,
} from '@/db/repositories/sales';
import { getRateForDate } from '@/db/repositories/rates';
import {
  DEFAULT_SLIDER_SETTINGS,
  getSliderSettings,
  getUnitPriceSliderRange,
} from '@/db/repositories/slider-settings';
import type {
  CashFlowTotals,
  Customer,
  FinishedProductStock,
  Sale,
} from '@/db/types';
import {
  moneyMinorToInput,
  parseAfnInput,
  parseKgInput,
  parseUsdInput,
  type Currency,
} from '@/domain/money';
import { calculateSaleLineMinor } from '@/domain/sales';
import { fa } from '@/i18n';
import { formatKg, formatMoney } from '@/lib/format';
import { formatJalaliISODate } from '@/lib/jalali';
import { getKabulDateISO } from '@/lib/time';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/providers/app-provider';
import { useDatabase } from '@/providers/database-provider';

export default function SalesScreen() {
  const db = useDatabase();
  const { factory } = useApp();
  const theme = useTheme();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [transactionSearch, setTransactionSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'complete' | 'incomplete'>('all');
  const [currencyFilter, setCurrencyFilter] = useState<'all' | 'AFN' | 'USD'>('all');
  const [finishedProducts, setFinishedProducts] = useState<FinishedProductStock[]>([]);
  const [cashTotals, setCashTotals] = useState<CashFlowTotals>({ afn: 0 });
  const [dailyRateMilli, setDailyRateMilli] = useState<number | null>(null);
  const [sliderSettings, setSliderSettings] = useState(DEFAULT_SLIDER_SETTINGS);
  const [finishedBalance, setFinishedBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSale, setShowSale] = useState(false);
  const [saleStep, setSaleStep] = useState(0);
  const [customerId, setCustomerId] = useState('');
  const [selectedFinishedProductId, setSelectedFinishedProductId] = useState('');
  const [currency, setCurrency] = useState<Currency>('AFN');
  const [quantity, setQuantity] = useState('');
  const [quantitySliderGrams, setQuantitySliderGrams] = useState<number | null>(null);
  const [unitPrice, setUnitPrice] = useState('');
  const [paidAmountMinor, setPaidAmountMinor] = useState<number | null>(null);
  const [paidAmountInput, setPaidAmountInput] = useState<string | null>(null);
  const [payingSaleId, setPayingSaleId] = useState<string | null>(null);
  const [additionalPaymentAmountMinor, setAdditionalPaymentAmountMinor] = useState(0);
  const [additionalPaymentAmountInput, setAdditionalPaymentAmountInput] = useState<string | null>(null);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!factory) return;
    try {
      setError(null);
      const [
        customerRows,
        saleRows,
        balance,
        productRows,
        salesCashTotals,
        dailyRate,
        loadedSliderSettings,
      ] = await Promise.all([
        getCustomers(db, factory.id),
        getSales(db, factory.id),
        getFinishedProductBalance(db, factory.id),
        getFinishedProducts(db, factory.id),
        getSalesCashTotals(db, factory.id),
        getRateForDate(db, factory.id, getKabulDateISO(new Date())),
        getSliderSettings(db, factory.id),
      ]);
      setCustomers(customerRows);
      setSales(saleRows);
      setFinishedBalance(balance);
      setFinishedProducts(productRows);
      setCashTotals(salesCashTotals);
      setDailyRateMilli(dailyRate?.rateMilli ?? null);
      setSliderSettings(loadedSliderSettings);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }, [db, factory]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const filteredSales = useMemo(() => {
    const query = transactionSearch.trim().toLocaleLowerCase();
    return sales.filter((sale) => {
      const statusMatches = statusFilter === 'all' ||
        (statusFilter === 'complete'
          ? sale.paymentStatus === 'paid'
          : sale.paymentStatus !== 'paid');
      const currencyMatches = currencyFilter === 'all' ||
        sale.currency === currencyFilter;
      const searchMatches = !query || [
        sale.customerName,
        ...sale.items.map((item) => item.finishedProductName),
        sale.reference ?? '',
        sale.notes ?? '',
        sale.saleDate,
        formatJalaliISODate(sale.saleDate),
      ].some((value) => value.toLocaleLowerCase().includes(query));
      return statusMatches && currencyMatches && searchMatches;
    });
  }, [currencyFilter, sales, statusFilter, transactionSearch]);

  const availableFinishedProducts = finishedProducts.filter(
    (product) => product.balanceGrams > 0
  );
  const selectedFinishedProduct =
    availableFinishedProducts.find((product) => product.id === selectedFinishedProductId) ??
    (availableFinishedProducts.length === 1 ? availableFinishedProducts[0] : null);
  const enteredQuantityGrams = parseKgInput(quantity);
  const enteredUnitPriceMinor = currency === 'AFN'
    ? parseAfnInput(unitPrice)
    : parseUsdInput(unitPrice);
  const currentPriceRange = getUnitPriceSliderRange(
    sliderSettings,
    'sale',
    currency
  );
  const enteredUnitPriceInRange =
    enteredUnitPriceMinor !== null &&
    enteredUnitPriceMinor >= currentPriceRange.min &&
    enteredUnitPriceMinor <= currentPriceRange.max;
  const saleTotalMinor =
    enteredQuantityGrams !== null && enteredQuantityGrams > 0 &&
    enteredUnitPriceInRange
      ? calculateSaleLineMinor(enteredQuantityGrams, enteredUnitPriceMinor)
      : null;
  const enteredPaidMinor = paidAmountMinor ?? saleTotalMinor ?? 0;

  const openCustomerForm = () => {
    setError(null);
    router.push('/customer-form');
  };

  const submitSale = async () => {
    if (!factory || saving) return;
    setError(null);
    if (!customerId) {
      setError(fa.sales.noCustomers);
      return;
    }
    if (!selectedFinishedProduct) {
      setError(
        availableFinishedProducts.length === 0
          ? fa.sales.noFinishedStock
          : fa.sales.productRequired
      );
      return;
    }

    const quantityGrams = parseKgInput(quantity);
    const unitPriceMinor = currency === 'AFN'
      ? parseAfnInput(unitPrice)
      : parseUsdInput(unitPrice);
    const paidMinor = paidAmountInput === null
      ? enteredPaidMinor
      : currency === 'AFN'
        ? parseAfnInput(paidAmountInput)
        : parseUsdInput(paidAmountInput);

    if (quantityGrams === null || quantityGrams <= 0 ||
        unitPriceMinor === null || unitPriceMinor < 0) {
      setError(fa.sales.invalidSale);
      return;
    }
    if (
      unitPriceMinor < currentPriceRange.min ||
      unitPriceMinor > currentPriceRange.max
    ) {
      setError(fa.sliderSettings.priceOutOfRange);
      return;
    }
    if (paidMinor === null || paidMinor < 0) {
      setError(fa.sales.invalidPayment);
      return;
    }
    if (saleTotalMinor === null || paidMinor > saleTotalMinor) {
      setError(fa.sales.paidAmountTooHigh);
      return;
    }

    setSaving(true);
    try {
      await postSale(db, {
        factoryId: factory.id,
        customerId,
        finishedProductId: selectedFinishedProduct.id,
        saleDate: getKabulDateISO(),
        currency,
        quantityGrams,
        unitPriceMinor,
        paidMinor,
        reference,
        notes,
      });
      setShowSale(false);
      setCustomerId('');
      setSelectedFinishedProductId('');
      setQuantity('');
      setQuantitySliderGrams(null);
      setUnitPrice('');
      setPaidAmountMinor(null);
      setPaidAmountInput(null);
      setReference('');
      setNotes('');
      setSaleStep(0);
      setSuccess(fa.sales.posted);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  };

  const handleSaleBack = () => {
    setError(null);
    if (saleStep === 0) {
      setShowSale(false);
      return;
    }
    setSaleStep((current) => current - 1);
  };

  const handleSaleNext = async () => {
    setError(null);
    if (saleStep === 0) {
      if (!customerId) {
        setError(fa.sales.noCustomers);
        return;
      }
      setSaleStep(1);
      return;
    }
    if (saleStep === 1) {
      if (!selectedFinishedProduct) {
        setError(
          availableFinishedProducts.length === 0
            ? fa.sales.noFinishedStock
            : fa.sales.productRequired
        );
        return;
      }
      if (!quantity.trim()) {
        setQuantity(String(selectedFinishedProduct.balanceGrams / 1000));
        setQuantitySliderGrams(selectedFinishedProduct.balanceGrams);
      }
      setSaleStep(2);
      return;
    }
    if (saleStep === 2) {
      if (!unitPrice.trim()) {
        setUnitPrice(moneyMinorToInput(currentPriceRange.max, currency));
      }
      setSaleStep(3);
      return;
    }
    if (saleStep === 3) {
      if (enteredQuantityGrams === null || enteredQuantityGrams <= 0) {
        setError(fa.sales.invalidSale);
        return;
      }
      if (!enteredUnitPriceInRange) {
        setError(fa.sliderSettings.priceOutOfRange);
        return;
      }
      if (selectedFinishedProduct &&
          enteredQuantityGrams > selectedFinishedProduct.balanceGrams) {
        setError(fa.sales.insufficientProductStock);
        return;
      }
      setSaleStep(4);
      return;
    }
    if (saleStep === 4) {
      const paidMinor = paidAmountInput === null
        ? enteredPaidMinor
        : currency === 'AFN'
          ? parseAfnInput(paidAmountInput)
          : parseUsdInput(paidAmountInput);
      if (paidMinor === null || paidMinor < 0) {
        setError(fa.sales.invalidPayment);
        return;
      }
      if (saleTotalMinor === null || paidMinor > saleTotalMinor) {
        setError(fa.sales.paidAmountTooHigh);
        return;
      }
      setSaleStep(5);
      return;
    }
    await submitSale();
  };

  const openSale = () => {
    setCustomerId('');
    setSelectedFinishedProductId('');
    setCurrency('AFN');
    setQuantity('');
    setQuantitySliderGrams(null);
    setUnitPrice('');
    setPaidAmountMinor(null);
    setPaidAmountInput(null);
    setReference('');
    setNotes('');
    setSaleStep(0);
    setError(null);
    setSuccess(null);
    setShowSale(true);
  };

  const submitAdditionalPayment = async () => {
    if (!factory || !payingSaleId || saving) return;
    const sale = sales.find((item) => item.id === payingSaleId);
    if (!sale) {
      setError(fa.sales.saleNotFound);
      return;
    }

    const amountMinor = additionalPaymentAmountInput === null
      ? additionalPaymentAmountMinor
      : sale.currency === 'AFN'
        ? parseAfnInput(additionalPaymentAmountInput)
        : parseUsdInput(additionalPaymentAmountInput);
    if (amountMinor === null || amountMinor <= 0) {
      setError(fa.sales.invalidPayment);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await recordSalePayment(db, {
        factoryId: factory.id,
        saleId: payingSaleId,
        amountMinor,
      });
      setPayingSaleId(null);
      setAdditionalPaymentAmountMinor(0);
      setAdditionalPaymentAmountInput(null);
      setSuccess(fa.sales.paymentRecorded);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  };

  const statusTone = (status: Sale['paymentStatus']) =>
    status === 'paid' ? 'success' : status === 'partial' ? 'warning' : 'danger';
  const statusLabel = (status: Sale['paymentStatus']) =>
    status === 'paid' ? fa.sales.paid : status === 'partial' ? fa.sales.partial : fa.sales.unpaid;

  return (
    <Screen>
      {showSale ? (
        <>
          <ScreenHeader title={fa.sales.newSale} />
          {error ? (
            <Card tone="danger">
              <ThemedText type="small" style={{ color: theme.danger }}>{error}</ThemedText>
            </Card>
          ) : null}
          <StepFlow
            currentStep={saleStep}
            totalSteps={6}
            title={[
              fa.sales.steps.customer,
              fa.sales.steps.product,
              fa.sales.steps.currency,
              fa.sales.steps.details,
              fa.sales.steps.payment,
              fa.sales.steps.review,
            ][saleStep]}
            backLabel={saleStep === 0 ? fa.common.cancel : fa.common.back}
            nextLabel={saleStep === 5 ? fa.sales.post : fa.common.continue}
            loading={saving}
            onBack={handleSaleBack}
            onNext={() => { void handleSaleNext(); }}
          >
            {saleStep === 0 ? (
              <View style={styles.stepContent}>
                {customers.length === 0 ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {fa.sales.noCustomers}
                  </ThemedText>
                ) : (
                  <ChoiceGroup
                    label={fa.sales.customer}
                    searchable
                    options={customers.map((customer) => ({
                      id: customer.id,
                      label: customer.name,
                      leading: (
                        <ContactAvatar
                          name={customer.name}
                          photoUri={customer.photoUri}
                          size={30}
                        />
                      ),
                    }))}
                    value={customerId}
                    onChange={setCustomerId}
                  />
                )}
                <AppButton
                  label={fa.sales.addCustomer}
                  variant="secondary"
                  onPress={openCustomerForm}
                />
              </View>
            ) : null}

            {saleStep === 1 ? availableFinishedProducts.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">{fa.sales.noFinishedStock}</ThemedText>
            ) : availableFinishedProducts.length === 1 ? (
              <View style={styles.productSummary}>
                <ThemedText type="smallBold">{availableFinishedProducts[0].name}</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {fa.inventory.stock}: {formatKg(availableFinishedProducts[0].balanceGrams)}
                </ThemedText>
              </View>
            ) : (
              <ChoiceGroup
                label={fa.sales.product}
                options={availableFinishedProducts.map((product) => ({
                  id: product.id,
                  label: product.name,
                  description: `${fa.inventory.stock}: ${formatKg(product.balanceGrams)}`,
                }))}
                value={selectedFinishedProduct?.id ?? ''}
                onChange={(productId) => {
                  setSelectedFinishedProductId(productId);
                  const product = availableFinishedProducts.find((item) => item.id === productId);
                  setQuantity(product ? String(product.balanceGrams / 1000) : '');
                  setQuantitySliderGrams(product?.balanceGrams ?? null);
                  setUnitPrice('');
                  setPaidAmountMinor(null);
                  setPaidAmountInput(null);
                }}
              />
            ) : null}

            {saleStep === 2 ? (
              <ChoiceGroup
                label={fa.sales.currency}
                options={[
                  { id: 'AFN', label: fa.units.afn },
                  { id: 'USD', label: fa.units.usd },
                ]}
                value={currency}
                onChange={(nextCurrency) => {
                  if (nextCurrency !== currency) {
                    setUnitPrice('');
                    setPaidAmountMinor(null);
                    setPaidAmountInput(null);
                  }
                  setCurrency(nextCurrency);
                }}
              />
            ) : null}

            {saleStep === 3 ? (
              <View style={styles.stepContent}>
                {selectedFinishedProduct ? (
                  <ThemedText type="caption" themeColor="textSecondary">
                    {fa.inventory.stock}: {formatKg(selectedFinishedProduct.balanceGrams)}
                  </ThemedText>
                ) : null}
                {selectedFinishedProduct ? (
                  <RangeSliderInput
                    label={fa.sales.quantity}
                    min={0}
                    max={selectedFinishedProduct.balanceGrams}
                    step={Math.min(100, selectedFinishedProduct.balanceGrams)}
                    value={quantitySliderGrams ?? selectedFinishedProduct.balanceGrams}
                    inputValue={quantity}
                    parseValue={parseKgInput}
                    formatValue={(value) => String(value / 1000)}
                    formatRangeLabel={formatKg}
                    onInputValueChange={(value) => {
                      setQuantity(value);
                      setPaidAmountMinor(null);
                      setPaidAmountInput(null);
                      const parsed = parseKgInput(value);
                      if (
                        parsed !== null &&
                        parsed >= 0 &&
                        parsed <= selectedFinishedProduct.balanceGrams
                      ) {
                        setQuantitySliderGrams(parsed);
                      }
                    }}
                    onValueChange={(value) => setQuantitySliderGrams(value)}
                    suffix={fa.common.kg}
                    error={
                      enteredQuantityGrams !== null &&
                      enteredQuantityGrams > selectedFinishedProduct.balanceGrams
                        ? fa.sales.insufficientProductStock
                        : quantity !== '' && enteredQuantityGrams === null
                          ? fa.sales.invalidSale
                          : null
                    }
                  />
                ) : null}
                <RangeSliderInput
                  label={fa.sales.unitPrice}
                  min={currentPriceRange.min}
                  max={currentPriceRange.max}
                  step={Math.min(
                    currentPriceRange.step,
                    currentPriceRange.max - currentPriceRange.min
                  )}
                  value={enteredUnitPriceMinor}
                  inputValue={
                    unitPrice ||
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
                    setUnitPrice(value);
                    setPaidAmountMinor(null);
                    setPaidAmountInput(null);
                  }}
                  onValueChange={() => {}}
                  suffix={currency === 'AFN' ? fa.units.afn : fa.units.usd}
                  error={
                    enteredUnitPriceMinor !== null && !enteredUnitPriceInRange
                      ? fa.sliderSettings.priceOutOfRange
                      : null
                  }
                />
                {saleTotalMinor !== null ? (
                  <ThemedText type="smallBold">
                    {fa.sales.total}: {formatMoney(saleTotalMinor, currency)}
                  </ThemedText>
                ) : null}
              </View>
            ) : null}

            {saleStep === 4 ? (
              <View style={styles.stepContent}>
                <PaymentSlider
                  totalMinor={saleTotalMinor ?? 0}
                  paidMinor={enteredPaidMinor}
                  step={1}
                  currency={currency}
                  rateMilli={dailyRateMilli}
                  rateMissingLabel={fa.common.dailyRateUnavailable}
                  paidLabel={fa.sales.paidAmount}
                  remainingLabel={fa.common.loanBalance}
                  invalidAmountMessage={fa.sales.invalidPayment}
                  amountInput={paidAmountInput}
                  onAmountInputChange={setPaidAmountInput}
                  onChange={(amountMinor) => {
                    setPaidAmountMinor(
                      amountMinor >= (saleTotalMinor ?? 0) ? null : amountMinor
                    );
                  }}
                  onSliderChange={(amountMinor, amountInput) => {
                    setPaidAmountMinor(
                      amountMinor >= (saleTotalMinor ?? 0) ? null : amountMinor
                    );
                    setPaidAmountInput(amountInput);
                  }}
                />
                <ThemedText type="caption" themeColor="textSecondary">
                  {fa.sales.unpaidBalanceHint}
                </ThemedText>
                <AppTextInput label={fa.sales.reference} optional value={reference} onChangeText={setReference} />
                <AppTextInput label={fa.sales.notes} optional multiline value={notes} onChangeText={setNotes} />
              </View>
            ) : null}

            {saleStep === 5 ? (
              <View style={styles.review}>
                <ThemedText type="default">
                  {fa.sales.customer}: {customers.find((customer) => customer.id === customerId)?.name}
                </ThemedText>
                <ThemedText type="default">
                  {fa.sales.product}: {selectedFinishedProduct?.name}
                </ThemedText>
                <ThemedText type="default">
                  {fa.sales.quantity}: {formatKg(enteredQuantityGrams ?? 0)}
                </ThemedText>
                <ThemedText type="default">
                  {fa.sales.total}: {formatMoney(saleTotalMinor ?? 0, currency)}
                </ThemedText>
                <ThemedText type="default">
                  {fa.sales.paidAmount}: {formatMoney(enteredPaidMinor ?? 0, currency)}
                </ThemedText>
                <ThemedText type="default">
                  {fa.sales.outstanding}:{' '}
                  {formatMoney(Math.max(0, (saleTotalMinor ?? 0) - (enteredPaidMinor ?? 0)), currency)}
                </ThemedText>
                {reference.trim() ? (
                  <ThemedText type="caption" themeColor="textSecondary">{fa.sales.reference}: {reference}</ThemedText>
                ) : null}
                {notes.trim() ? (
                  <ThemedText type="caption" themeColor="textSecondary">{fa.sales.notes}: {notes}</ThemedText>
                ) : null}
              </View>
            ) : null}
          </StepFlow>
        </>
      ) : (
        <>
          <ScreenHeader
            title={fa.sales.title}
            subtitle={fa.sales.subtitle}
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
            title={fa.sales.cashTitle}
            description={fa.sales.cashSummary}
            totalLabel={fa.sales.cashTotal}
            totals={cashTotals}
          />

          <Card>
            <ThemedText type="caption" themeColor="textSecondary">
              {fa.sales.finishedBalance}
            </ThemedText>
            <ThemedText type="number">{formatKg(finishedBalance)}</ThemedText>
          </Card>

          <View style={styles.actions}>
            <AppButton
              label={fa.contacts.manageCustomers}
              variant="secondary"
              onPress={() => router.push('/customers')}
              style={styles.action}
            />
            <AppButton
              label={fa.sales.newSale}
              onPress={openSale}
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

          <ThemedText type="subtitle">{fa.sales.history}</ThemedText>
          {sales.length === 0 && !loading ? (
            <EmptyState icon={Icons.receipt} title={fa.sales.empty} body="" />
          ) : sales.length > 0 && filteredSales.length === 0 ? (
            <EmptyState
              icon={Icons.receipt}
              title={fa.reports.noMatchingTransactions}
              body=""
            />
          ) : (
            <Card padded={false}>
              {filteredSales.map((sale, index) => (
                <View key={sale.id}>
                  <View style={styles.saleRow}>
                    <View style={styles.saleText}>
                      <View style={styles.contactHeading}>
                        <ContactAvatar
                          name={sale.customerName}
                          photoUri={
                            customers.find((customer) => customer.id === sale.customerId)
                              ?.photoUri ?? null
                          }
                          size={38}
                        />
                        <ThemedText type="default">{sale.customerName}</ThemedText>
                      </View>
                      <ThemedText type="caption" themeColor="textSecondary">
                        {formatJalaliISODate(sale.saleDate)} · {sale.items.map((item) =>
                          `${item.finishedProductName}: ${formatKg(item.quantityGrams)}`
                        ).join('، ')}
                      </ThemedText>
                      <ThemedText type="caption" themeColor="textSecondary">
                        {fa.sales.outstanding}: {formatMoney(sale.outstandingOriginalMinor, sale.currency)}
                      </ThemedText>
                      {sale.payments.length > 0 ? (
                        <ThemedText type="caption" themeColor="textSecondary">
                          {fa.sales.paymentHistory}:{' '}
                          {sale.payments.map((payment) =>
                            formatMoney(payment.amountMinor, payment.currency)
                          ).join(' · ')}
                        </ThemedText>
                      ) : null}
                    </View>
                    <View style={styles.saleValue}>
                      <ThemedText type="smallBold">
                        {formatMoney(sale.totalOriginalMinor, sale.currency)}
                      </ThemedText>
                      <Badge tone={statusTone(sale.paymentStatus)} label={statusLabel(sale.paymentStatus)} />
                    </View>
                  </View>
                  {sale.outstandingOriginalMinor > 0 ? (
                    <AppButton
                      label={fa.sales.addPayment}
                      variant="primary"
                      onPress={() => {
                        setError(null);
                        setSuccess(null);
                        setPayingSaleId(sale.id);
                        setAdditionalPaymentAmountMinor(sale.outstandingOriginalMinor);
                        setAdditionalPaymentAmountInput(null);
                      }}
                      style={styles.paymentAction}
                    />
                  ) : null}
                  {payingSaleId === sale.id ? (
                    <PaymentCollectionForm
                      title={fa.sales.addPayment}
                      outstandingLabel={fa.sales.outstanding}
                      outstandingOriginalMinor={sale.outstandingOriginalMinor}
                      currencyLabel={fa.sales.currency}
                      amountLabel={fa.sales.paymentAmount}
                      invalidAmountMessage={fa.sales.invalidPayment}
                      saveLabel={fa.sales.addPayment}
                      amountMinor={additionalPaymentAmountMinor}
                      amountInput={additionalPaymentAmountInput}
                      step={1}
                      currency={sale.currency}
                      rateMilli={dailyRateMilli}
                      saving={saving}
                      onAmountInputChange={setAdditionalPaymentAmountInput}
                      onAmountChange={setAdditionalPaymentAmountMinor}
                      onSliderChange={(amountMinor, amountInput) => {
                        setAdditionalPaymentAmountMinor(amountMinor);
                        setAdditionalPaymentAmountInput(amountInput);
                      }}
                      onSave={submitAdditionalPayment}
                      onCancel={() => setPayingSaleId(null)}
                    />
                  ) : null}
                  {index < filteredSales.length - 1 ? (
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
  productSummary: { gap: Spacing.one },
  saleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  saleText: { flex: 1, gap: 2 },
  contactHeading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  saleValue: { alignItems: 'flex-end', gap: Spacing.one },
  paymentAction: { marginHorizontal: Spacing.three, marginBottom: Spacing.three },
  recordSeparator: { height: StyleSheet.hairlineWidth },
});
