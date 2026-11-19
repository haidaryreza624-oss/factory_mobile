import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { AppTextInput } from '@/components/ui/app-text-input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Icons } from '@/constants/icons';
import { Radius, Spacing } from '@/constants/theme';
import { getFinishedProductBalance } from '@/db/repositories/production';
import {
  getCustomers,
  getSales,
  postSale,
  saveCustomer,
} from '@/db/repositories/sales';
import type { Customer, Sale } from '@/db/types';
import { parseAfnInput, parseKgInput, parseUsdInput, type Currency } from '@/domain/money';
import { fa } from '@/i18n';
import { formatAfn, formatKg, formatMoney } from '@/lib/format';
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
  const [finishedBalance, setFinishedBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCustomer, setShowCustomer] = useState(false);
  const [showSale, setShowSale] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [currency, setCurrency] = useState<Currency>('AFN');
  const [paymentCurrency, setPaymentCurrency] = useState<Currency>('AFN');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!factory) return;
    try {
      setError(null);
      const [customerRows, saleRows, balance] = await Promise.all([
        getCustomers(db, factory.id),
        getSales(db, factory.id),
        getFinishedProductBalance(db, factory.id),
      ]);
      setCustomers(customerRows);
      setSales(saleRows);
      setFinishedBalance(balance);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }, [db, factory]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const handleSaveCustomer = async () => {
    if (!factory || saving) return;
    if (!customerName.trim()) {
      setError(fa.sales.customerNameRequired);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const customer = await saveCustomer(db, {
        factoryId: factory.id,
        name: customerName,
        phone: customerPhone,
        address: customerAddress,
        notes: customerNotes,
      });
      setCustomers((current) =>
        [...current, customer].sort((a, b) => a.name.localeCompare(b.name))
      );
      setCustomerId(customer.id);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setCustomerNotes('');
      setShowCustomer(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  };

  const submitSale = async () => {
    if (!factory || saving) return;
    setError(null);
    if (!customerId) {
      setError(fa.sales.noCustomers);
      return;
    }

    const quantityGrams = parseKgInput(quantity);
    const unitPriceMinor = currency === 'AFN'
      ? parseAfnInput(unitPrice)
      : parseUsdInput(unitPrice);
    const paidMinor = paymentCurrency === 'AFN'
      ? parseAfnInput(paidAmount)
      : parseUsdInput(paidAmount);

    if (quantityGrams === null || quantityGrams <= 0 ||
        unitPriceMinor === null || unitPriceMinor < 0) {
      setError(fa.sales.invalidSale);
      return;
    }
    if (paidMinor === null || paidMinor < 0) {
      setError(fa.sales.invalidPayment);
      return;
    }

    setSaving(true);
    try {
      await postSale(db, {
        factoryId: factory.id,
        customerId,
        saleDate: getKabulDateISO(),
        currency,
        quantityGrams,
        unitPriceMinor,
        paymentCurrency,
        paidMinor,
        reference,
        notes,
      });
      setShowSale(false);
      setCustomerId('');
      setQuantity('');
      setUnitPrice('');
      setPaidAmount('');
      setReference('');
      setNotes('');
      setSuccess(fa.sales.posted);
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

      <Card>
        <ThemedText type="caption" themeColor="textSecondary">
          {fa.sales.finishedBalance}
        </ThemedText>
        <ThemedText type="number">{formatKg(finishedBalance)}</ThemedText>
      </Card>

      <View style={styles.actions}>
        <AppButton
          label={fa.sales.addCustomer}
          variant="secondary"
          onPress={() => { setShowCustomer((value) => !value); setError(null); }}
          style={styles.action}
        />
        <AppButton
          label={fa.sales.newSale}
          onPress={() => { setShowSale((value) => !value); setError(null); setSuccess(null); }}
          style={styles.action}
        />
      </View>

      {showCustomer ? (
        <Card>
          <ThemedText type="subtitle">{fa.sales.addCustomer}</ThemedText>
          <AppTextInput label={fa.sales.customerName} value={customerName} onChangeText={setCustomerName} />
          <AppTextInput label={fa.sales.customerPhone} value={customerPhone} onChangeText={setCustomerPhone} keyboardType="phone-pad" />
          <AppTextInput label={fa.sales.customerAddress} value={customerAddress} onChangeText={setCustomerAddress} />
          <AppTextInput label={fa.sales.customerNotes} value={customerNotes} onChangeText={setCustomerNotes} />
          <View style={styles.formActions}>
            <AppButton label={fa.common.cancel} variant="secondary" onPress={() => setShowCustomer(false)} style={styles.action} />
            <AppButton label={fa.common.save} onPress={handleSaveCustomer} loading={saving} style={styles.action} />
          </View>
        </Card>
      ) : null}

      {showSale ? (
        <Card>
          <ThemedText type="subtitle">{fa.sales.newSale}</ThemedText>

          {customers.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">{fa.sales.noCustomers}</ThemedText>
          ) : (
            <View style={styles.field}>
              <ThemedText type="label">{fa.sales.customer}</ThemedText>
              <View style={styles.optionRow}>
                {customers.map((customer) => (
                  <Pressable
                    key={customer.id}
                    accessibilityRole="button"
                    onPress={() => setCustomerId(customer.id)}
                    style={[
                      styles.option,
                      {
                        backgroundColor: customerId === customer.id ? theme.primary : theme.surfaceMuted,
                        borderColor: customerId === customer.id ? theme.primary : theme.border,
                      },
                    ]}>
                    <ThemedText
                      type="smallBold"
                      style={{ color: customerId === customer.id ? theme.primaryText : theme.text }}>
                      {customer.name}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          <View style={styles.field}>
            <ThemedText type="label">{fa.sales.currency}</ThemedText>
            <View style={styles.optionRow}>
              {(['AFN', 'USD'] as Currency[]).map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  onPress={() => { setCurrency(value); setPaymentCurrency(value); }}
                  style={[
                    styles.option,
                    { backgroundColor: currency === value ? theme.primary : theme.surfaceMuted, borderColor: theme.border },
                  ]}>
                  <ThemedText type="smallBold" style={{ color: currency === value ? theme.primaryText : theme.text }}>
                    {value === 'AFN' ? fa.units.afn : fa.units.usd}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>

          <AppTextInput
            label={fa.sales.quantity}
            value={quantity}
            onChangeText={setQuantity}
            suffix={fa.common.kg}
            keyboardType="decimal-pad"
          />
          <AppTextInput
            label={fa.sales.unitPrice}
            value={unitPrice}
            onChangeText={setUnitPrice}
            suffix={currency === 'AFN' ? fa.units.afn : fa.units.usd}
            keyboardType="decimal-pad"
          />

          <View style={styles.field}>
            <ThemedText type="label">{fa.sales.paymentCurrency}</ThemedText>
            <View style={styles.optionRow}>
              {(['AFN', 'USD'] as Currency[]).map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  onPress={() => setPaymentCurrency(value)}
                  style={[
                    styles.option,
                    { backgroundColor: paymentCurrency === value ? theme.primary : theme.surfaceMuted, borderColor: theme.border },
                  ]}>
                  <ThemedText type="smallBold" style={{ color: paymentCurrency === value ? theme.primaryText : theme.text }}>
                    {value === 'AFN' ? fa.units.afn : fa.units.usd}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>

          <AppTextInput
            label={fa.sales.paidAmount}
            value={paidAmount}
            onChangeText={setPaidAmount}
            suffix={paymentCurrency === 'AFN' ? fa.units.afn : fa.units.usd}
            keyboardType="decimal-pad"
          />
          <AppTextInput label={fa.sales.reference} value={reference} onChangeText={setReference} />
          <AppTextInput label={fa.sales.notes} value={notes} onChangeText={setNotes} />

          <View style={styles.formActions}>
            <AppButton label={fa.common.cancel} variant="secondary" onPress={() => setShowSale(false)} style={styles.action} />
            <AppButton label={fa.sales.post} onPress={submitSale} loading={saving} style={styles.action} />
          </View>
        </Card>
      ) : null}

      <ThemedText type="subtitle">{fa.sales.history}</ThemedText>
      {sales.length === 0 && !loading ? (
        <EmptyState icon={Icons.receipt} title={fa.sales.empty} body="" />
      ) : (
        <Card padded={false}>
          {sales.map((sale) => (
            <View key={sale.id} style={styles.saleRow}>
              <View style={styles.saleText}>
                <ThemedText type="default">{sale.customerName}</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {formatJalaliISODate(sale.saleDate)} · {formatKg(sale.items[0]?.quantityGrams ?? 0)}
                </ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {fa.sales.outstanding}: {formatAfn(sale.outstandingAfn)}
                </ThemedText>
              </View>
              <View style={styles.saleValue}>
                <ThemedText type="smallBold">
                  {formatMoney(sale.totalOriginalMinor, sale.currency)}
                </ThemedText>
                <Badge tone={statusTone(sale.paymentStatus)} label={statusLabel(sale.paymentStatus)} />
              </View>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', paddingVertical: Spacing.two },
  actions: { flexDirection: 'row', gap: Spacing.two },
  action: { flex: 1 },
  formActions: { flexDirection: 'row', gap: Spacing.two },
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
  saleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  saleText: { flex: 1, gap: 2 },
  saleValue: { alignItems: 'flex-end', gap: Spacing.one },
});
