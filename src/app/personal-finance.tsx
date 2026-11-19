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
import {
  getFinanceCategories,
  getPersonalTransactions,
  postPersonalTransaction,
} from '@/db/repositories/finance';
import type { FinanceCategory, PersonalTransaction } from '@/db/types';
import { calculatePersonalBalance } from '@/domain/finance';
import { parseAfnInput } from '@/domain/money';
import { fa } from '@/i18n';
import { formatAfn } from '@/lib/format';
import { formatJalaliISODate } from '@/lib/jalali';
import { getKabulDateISO } from '@/lib/time';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/providers/app-provider';
import { useDatabase } from '@/providers/database-provider';

export default function PersonalFinanceScreen() {
  const db = useDatabase();
  const { factory } = useApp();
  const theme = useTheme();
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [transactions, setTransactions] = useState<PersonalTransaction[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!factory) return;
    try {
      setError(null);
      const [categoryRows, transactionRows] = await Promise.all([
        getFinanceCategories(db, factory.id, 'personal'),
        getPersonalTransactions(db, factory.id),
      ]);
      setCategories(categoryRows);
      setTransactions(transactionRows);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }, [db, factory]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const submit = async () => {
    if (!factory || saving) return;
    setError(null);
    const amountAfn = parseAfnInput(amount);
    if (amountAfn === null || amountAfn <= 0) {
      setError(fa.personalFinance.invalidAmount);
      return;
    }
    setSaving(true);
    try {
      await postPersonalTransaction(db, {
        factoryId: factory.id,
        categoryId: categoryId || undefined,
        transactionType,
        transactionDate: getKabulDateISO(),
        amountAfn,
        description,
        notes,
      });
      setShowForm(false);
      setCategoryId('');
      setAmount('');
      setDescription('');
      setNotes('');
      setSuccess(fa.personalFinance.posted);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  };

  const balance = calculatePersonalBalance(transactions);

  return (
    <Screen>
      <ScreenHeader title={fa.personalFinance.title} subtitle={fa.personalFinance.subtitle} onBack={() => router.back()} />
      {loading ? <View style={styles.loading}><ActivityIndicator color={theme.primary} /></View> : null}
      {error ? <Card tone="danger"><ThemedText type="small" style={{ color: theme.danger }}>{error}</ThemedText></Card> : null}
      {success ? <Card tone="success"><ThemedText type="small" style={{ color: theme.success }}>{success}</ThemedText></Card> : null}

      <Card tone={balance >= 0 ? 'success' : 'warning'}>
        <ThemedText type="caption" themeColor="textSecondary">{fa.personalFinance.balance}</ThemedText>
        <ThemedText type="number">{formatAfn(balance)}</ThemedText>
      </Card>

      <AppButton label={fa.personalFinance.newTransaction} onPress={() => setShowForm((value) => !value)} />

      {showForm ? (
        <Card>
          <ThemedText type="subtitle">{fa.personalFinance.newTransaction}</ThemedText>
          <View style={styles.optionRow}>
            {(['income', 'expense'] as const).map((type) => (
              <Pressable
                key={type}
                accessibilityRole="button"
                onPress={() => setTransactionType(type)}
                style={[
                  styles.option,
                  {
                    backgroundColor: transactionType === type ? theme.primary : theme.surfaceMuted,
                    borderColor: transactionType === type ? theme.primary : theme.border,
                  },
                ]}>
                <ThemedText type="smallBold" style={{ color: transactionType === type ? theme.primaryText : theme.text }}>
                  {type === 'income' ? fa.personalFinance.income : fa.personalFinance.expense}
                </ThemedText>
              </Pressable>
            ))}
          </View>
          <View style={styles.field}>
            <ThemedText type="label">{fa.personalFinance.category}</ThemedText>
            <View style={styles.optionRow}>
              {categories.map((category) => (
                <Pressable
                  key={category.id}
                  accessibilityRole="button"
                  onPress={() => setCategoryId(category.id)}
                  style={[
                    styles.option,
                    {
                      backgroundColor: categoryId === category.id ? theme.primarySoft : theme.surfaceMuted,
                      borderColor: categoryId === category.id ? theme.primary : theme.border,
                    },
                  ]}>
                  <ThemedText type="smallBold">{category.name}</ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
          <AppTextInput label={fa.personalFinance.amount} value={amount} onChangeText={setAmount} suffix={fa.units.afn} keyboardType="decimal-pad" />
          <AppTextInput label={fa.personalFinance.description} value={description} onChangeText={setDescription} />
          <AppTextInput label={fa.personalFinance.notes} value={notes} onChangeText={setNotes} />
          <View style={styles.formActions}>
            <AppButton label={fa.common.cancel} variant="secondary" onPress={() => setShowForm(false)} style={styles.action} />
            <AppButton label={fa.personalFinance.post} onPress={submit} loading={saving} style={styles.action} />
          </View>
        </Card>
      ) : null}

      <ThemedText type="subtitle">{fa.personalFinance.history}</ThemedText>
      {transactions.length === 0 && !loading ? (
        <EmptyState icon={Icons.person} title={fa.personalFinance.empty} body="" />
      ) : (
        <Card padded={false}>
          {transactions.map((transaction) => (
            <View key={transaction.id} style={styles.row}>
              <View style={styles.rowText}>
                <ThemedText type="default">
                  {transaction.description || transaction.categoryName ||
                    (transaction.transactionType === 'income' ? fa.personalFinance.income : fa.personalFinance.expense)}
                </ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {formatJalaliISODate(transaction.transactionDate)}
                </ThemedText>
              </View>
              <ThemedText
                type="smallBold"
                style={{ color: transaction.transactionType === 'income' ? theme.success : theme.danger }}>
                {transaction.transactionType === 'income' ? '+' : '−'}{formatAfn(transaction.amountAfn)}
              </ThemedText>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', paddingVertical: Spacing.two },
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
  formActions: { flexDirection: 'row', gap: Spacing.two },
  action: { flex: 1 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  rowText: { flex: 1, gap: 2 },
});
