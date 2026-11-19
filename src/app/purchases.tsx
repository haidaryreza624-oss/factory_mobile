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
import { getRawMaterials } from '@/db/repositories/inventory';
import {
  getPurchases,
  getSuppliers,
  postPurchase,
  saveSupplier as saveSupplierRecord,
} from '@/db/repositories/purchases';
import type { Purchase, RawMaterial, Supplier } from '@/db/types';
import { parseAfnInput, parseKgInput, parseUsdInput, type Currency } from '@/domain/money';
import { fa } from '@/i18n';
import { formatAfn, formatMoney } from '@/lib/format';
import { formatJalaliISODate } from '@/lib/jalali';
import { getKabulDateISO } from '@/lib/time';
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSupplier, setShowSupplier] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');
  const [supplierNotes, setSupplierNotes] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [currency, setCurrency] = useState<Currency>('AFN');
  const [paymentCurrency, setPaymentCurrency] = useState<Currency>('AFN');
  const [paidAmount, setPaidAmount] = useState('');
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
      const [supplierRows, materialRows, purchaseRows] = await Promise.all([
        getSuppliers(db, factory.id),
        getRawMaterials(db, factory.id),
        getPurchases(db, factory.id),
      ]);
      setSuppliers(supplierRows);
      setMaterials(materialRows);
      setPurchases(purchaseRows);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }, [db, factory]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const openPurchase = () => {
    setError(null);
    setSuccess(null);
    setShowPurchase(true);
  };

  const handleSaveSupplier = async () => {
    if (!factory || saving) return;
    if (!supplierName.trim()) {
      setError(fa.purchases.supplierNameRequired);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const supplier = await saveSupplierRecord(db, {
        factoryId: factory.id,
        name: supplierName,
        phone: supplierPhone,
        address: supplierAddress,
        notes: supplierNotes,
      });
      setSuppliers((current) => [...current, supplier].sort((a, b) => a.name.localeCompare(b.name)));
      setSupplierId(supplier.id);
      setSupplierName('');
      setSupplierPhone('');
      setSupplierAddress('');
      setSupplierNotes('');
      setShowSupplier(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
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
      const quantity = parseKgInput(item.quantity);
      const unitPrice = currency === 'AFN'
        ? parseAfnInput(item.unitPrice)
        : parseUsdInput(item.unitPrice);
      if (!item.rawMaterialId || quantity === null || quantity <= 0 ||
          unitPrice === null || unitPrice < 0) {
        setError(fa.purchases.invalidItem);
        return;
      }
      parsedItems.push({
        rawMaterialId: item.rawMaterialId,
        quantityGrams: quantity,
        unitPriceMinor: unitPrice,
      });
    }

    const paidMinor = paymentCurrency === 'AFN'
      ? parseAfnInput(paidAmount)
      : parseUsdInput(paidAmount);
    if (paidMinor === null || paidMinor < 0) {
      setError(fa.purchases.invalidPayment);
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
        paymentCurrency,
        paidMinor,
        reference,
        notes,
      });
      setShowPurchase(false);
      setSupplierId('');
      setPaidAmount('');
      setReference('');
      setNotes('');
      setItems([{ rawMaterialId: '', quantity: '', unitPrice: '' }]);
      setSuccess(fa.purchases.posted);
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

  return (
    <Screen>
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

      <View style={styles.actions}>
        <AppButton
          label={fa.purchases.addSupplier}
          variant="secondary"
          onPress={() => { setShowSupplier((value) => !value); setError(null); }}
          style={styles.action}
        />
        <AppButton
          label={fa.purchases.newPurchase}
          onPress={openPurchase}
          style={styles.action}
        />
      </View>

      {showSupplier ? (
        <Card>
          <ThemedText type="subtitle">{fa.purchases.addSupplier}</ThemedText>
          <AppTextInput label={fa.purchases.supplierName} value={supplierName} onChangeText={setSupplierName} />
          <AppTextInput label={fa.purchases.supplierPhone} value={supplierPhone} onChangeText={setSupplierPhone} keyboardType="phone-pad" />
          <AppTextInput label={fa.purchases.supplierAddress} value={supplierAddress} onChangeText={setSupplierAddress} />
          <AppTextInput label={fa.purchases.supplierNotes} value={supplierNotes} onChangeText={setSupplierNotes} />
          <View style={styles.formActions}>
            <AppButton label={fa.common.cancel} variant="secondary" onPress={() => setShowSupplier(false)} style={styles.action} />
            <AppButton label={fa.common.save} onPress={handleSaveSupplier} loading={saving} style={styles.action} />
          </View>
        </Card>
      ) : null}

      {showPurchase ? (
        <Card>
          <ThemedText type="subtitle">{fa.purchases.newPurchase}</ThemedText>

          {suppliers.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">{fa.purchases.noSuppliers}</ThemedText>
          ) : (
            <View style={styles.field}>
              <ThemedText type="label">{fa.purchases.supplier}</ThemedText>
              <View style={styles.optionRow}>
                {suppliers.map((supplier) => (
                  <Pressable
                    key={supplier.id}
                    accessibilityRole="button"
                    onPress={() => setSupplierId(supplier.id)}
                    style={[
                      styles.option,
                      {
                        backgroundColor: supplierId === supplier.id ? theme.primary : theme.surfaceMuted,
                        borderColor: supplierId === supplier.id ? theme.primary : theme.border,
                      },
                    ]}>
                    <ThemedText
                      type="smallBold"
                      style={{ color: supplierId === supplier.id ? theme.primaryText : theme.text }}>
                      {supplier.name}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          <View style={styles.field}>
            <ThemedText type="label">{fa.purchases.currency}</ThemedText>
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

          {items.map((item, index) => (
            <Card key={index} tone="default" style={styles.itemCard}>
              {materials.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">{fa.purchases.noMaterials}</ThemedText>
              ) : (
                <View style={styles.field}>
                  <ThemedText type="label">{fa.purchases.material}</ThemedText>
                  <View style={styles.optionRow}>
                    {materials.map((material) => (
                      <Pressable
                        key={material.id}
                        accessibilityRole="button"
                        onPress={() => updateItem(index, { rawMaterialId: material.id })}
                        style={[
                          styles.option,
                          {
                            backgroundColor: item.rawMaterialId === material.id ? theme.primarySoft : theme.surfaceMuted,
                            borderColor: item.rawMaterialId === material.id ? theme.primary : theme.border,
                          },
                        ]}>
                        <ThemedText type="smallBold">{material.name}</ThemedText>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
              <AppTextInput
                label={fa.purchases.quantity}
                value={item.quantity}
                onChangeText={(value) => updateItem(index, { quantity: value })}
                suffix={fa.common.kg}
                keyboardType="decimal-pad"
              />
              <AppTextInput
                label={fa.purchases.unitPrice}
                value={item.unitPrice}
                onChangeText={(value) => updateItem(index, { unitPrice: value })}
                suffix={currency === 'AFN' ? fa.units.afn : fa.units.usd}
                keyboardType="decimal-pad"
              />
              {items.length > 1 ? (
                <AppButton
                  label={fa.common.close}
                  size="small"
                  variant="ghost"
                  onPress={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                />
              ) : null}
            </Card>
          ))}

          <AppButton
            label={fa.purchases.addItem}
            variant="secondary"
            onPress={() => setItems((current) => [...current, { rawMaterialId: '', quantity: '', unitPrice: '' }])}
          />

          <View style={styles.field}>
            <ThemedText type="label">{fa.purchases.paymentCurrency}</ThemedText>
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
            label={fa.purchases.paidAmount}
            value={paidAmount}
            onChangeText={setPaidAmount}
            suffix={paymentCurrency === 'AFN' ? fa.units.afn : fa.units.usd}
            keyboardType="decimal-pad"
          />
          <AppTextInput label={fa.purchases.reference} value={reference} onChangeText={setReference} />
          <AppTextInput label={fa.purchases.notes} value={notes} onChangeText={setNotes} />

          <View style={styles.formActions}>
            <AppButton label={fa.common.cancel} variant="secondary" onPress={() => setShowPurchase(false)} style={styles.action} />
            <AppButton label={fa.purchases.post} onPress={submitPurchase} loading={saving} style={styles.action} />
          </View>
        </Card>
      ) : null}

      <ThemedText type="subtitle">{fa.purchases.history}</ThemedText>
      {purchases.length === 0 && !loading ? (
        <EmptyState icon={Icons.cart} title={fa.purchases.empty} body="" />
      ) : (
        <Card padded={false}>
          {purchases.map((purchase) => (
            <View key={purchase.id} style={styles.purchaseRow}>
              <View style={styles.purchaseText}>
                <ThemedText type="default">{purchase.supplierName}</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {formatJalaliISODate(purchase.purchaseDate)} · {purchase.items.map((item) => item.rawMaterialName).join('، ')}
                </ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {fa.purchases.outstanding}: {formatAfn(purchase.outstandingAfn)}
                </ThemedText>
              </View>
              <View style={styles.purchaseValue}>
                <ThemedText type="smallBold">
                  {formatMoney(purchase.totalOriginalMinor, purchase.currency)}
                </ThemedText>
                <Badge tone={statusTone(purchase.paymentStatus)} label={statusLabel(purchase.paymentStatus)} />
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
  itemCard: { borderWidth: StyleSheet.hairlineWidth },
  purchaseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  purchaseText: { flex: 1, gap: 2 },
  purchaseValue: { alignItems: 'flex-end', gap: Spacing.one },
});
