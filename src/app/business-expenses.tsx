import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { AppTextInput } from '@/components/ui/app-text-input';
import { Card } from '@/components/ui/card';
import { ChoiceGroup } from '@/components/ui/choice-group';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Icons } from '@/constants/icons';
import { Spacing } from '@/constants/theme';
import {
  getBusinessExpenses,
  getFinanceCategories,
  postBusinessExpense,
} from '@/db/repositories/finance';
import type { BusinessExpense, FinanceCategory } from '@/db/types';
import { parseAfnInput } from '@/domain/money';
import { fa } from '@/i18n';
import { formatAfn } from '@/lib/format';
import { formatJalaliISODate } from '@/lib/jalali';
import { getKabulDateISO } from '@/lib/time';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/providers/app-provider';
import { useDatabase } from '@/providers/database-provider';

export default function BusinessExpensesScreen() {
  const db = useDatabase();
  const { factory } = useApp();
  const theme = useTheme();
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [expenses, setExpenses] = useState<BusinessExpense[]>([]);
  const [showForm, setShowForm] = useState(false);
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
      const [categoryRows, expenseRows] = await Promise.all([
        getFinanceCategories(db, factory.id, 'business'),
        getBusinessExpenses(db, factory.id),
      ]);
      setCategories(categoryRows);
      setExpenses(expenseRows);
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
    if (!categoryId) {
      setError(fa.businessExpenses.categoryRequired);
      return;
    }
    const amountAfn = parseAfnInput(amount);
    if (amountAfn === null || amountAfn <= 0) {
      setError(fa.businessExpenses.invalidAmount);
      return;
    }
    setSaving(true);
    try {
      await postBusinessExpense(db, {
        factoryId: factory.id,
        categoryId,
        expenseDate: getKabulDateISO(),
        amountAfn,
        description,
        notes,
      });
      setShowForm(false);
      setCategoryId('');
      setAmount('');
      setDescription('');
      setNotes('');
      setSuccess(fa.businessExpenses.posted);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title={fa.businessExpenses.title} subtitle={fa.businessExpenses.subtitle} onBack={() => router.back()} />
      {loading ? <View style={styles.loading}><ActivityIndicator color={theme.primary} /></View> : null}
      {error ? <Card tone="danger"><ThemedText type="small" style={{ color: theme.danger }}>{error}</ThemedText></Card> : null}
      {success ? <Card tone="success"><ThemedText type="small" style={{ color: theme.success }}>{success}</ThemedText></Card> : null}

      <AppButton label={fa.businessExpenses.newExpense} onPress={() => setShowForm((value) => !value)} />

      {showForm ? (
        <Card>
          <ThemedText type="subtitle">{fa.businessExpenses.newExpense}</ThemedText>
          <ChoiceGroup
            label={fa.businessExpenses.category}
            options={categories.map((category) => ({ id: category.id, label: category.name }))}
            value={categoryId}
            onChange={setCategoryId}
          />
          <AppTextInput label={fa.businessExpenses.amount} value={amount} onChangeText={setAmount} suffix={fa.units.afn} keyboardType="decimal-pad" />
          <AppTextInput label={fa.businessExpenses.description} optional value={description} onChangeText={setDescription} />
          <AppTextInput label={fa.businessExpenses.notes} optional multiline value={notes} onChangeText={setNotes} />
          <View style={styles.formActions}>
            <AppButton label={fa.common.cancel} variant="secondary" onPress={() => setShowForm(false)} style={styles.action} />
            <AppButton label={fa.businessExpenses.post} onPress={submit} loading={saving} style={styles.action} />
          </View>
        </Card>
      ) : null}

      <ThemedText type="subtitle">{fa.businessExpenses.history}</ThemedText>
      {expenses.length === 0 && !loading ? (
        <EmptyState icon={Icons.receipt} title={fa.businessExpenses.empty} body="" />
      ) : (
        <Card padded={false}>
          {expenses.map((expense) => (
            <View key={expense.id} style={styles.row}>
              <View style={styles.rowText}>
                <ThemedText type="default">{expense.description || expense.categoryName}</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {expense.categoryName} · {formatJalaliISODate(expense.expenseDate)}
                </ThemedText>
              </View>
              <ThemedText type="smallBold">{formatAfn(expense.amountAfn)}</ThemedText>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', paddingVertical: Spacing.two },
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
