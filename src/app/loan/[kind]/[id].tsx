import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ContactAvatar } from '@/components/contacts/contact-avatar';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Spacing } from '@/constants/theme';
import { getPurchase } from '@/db/repositories/purchases';
import { getSale } from '@/db/repositories/sales';
import type { Purchase, Sale } from '@/db/types';
import { calculateLoanAtCreationMinor } from '@/domain/loans';
import { fa } from '@/i18n';
import { formatMoney } from '@/lib/format';
import { formatJalaliISODate } from '@/lib/jalali';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/providers/app-provider';
import { useDatabase } from '@/providers/database-provider';

type LoanKind = 'purchase' | 'sale';
type LoanRecord = Purchase | Sale;

function isLoanKind(value: string | undefined): value is LoanKind {
  return value === 'purchase' || value === 'sale';
}

export default function LoanHistoryScreen() {
  const { kind: rawKind, id: rawId } = useLocalSearchParams<{
    kind?: string;
    id?: string;
  }>();
  const kind = isLoanKind(rawKind) ? rawKind : null;
  const transactionId = typeof rawId === 'string' ? rawId : null;
  const db = useDatabase();
  const { factory } = useApp();
  const theme = useTheme();
  const [transaction, setTransaction] = useState<LoanRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!factory || !kind || !transactionId) {
      setLoading(false);
      setError(fa.contacts.loanNotFound);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const record = kind === 'purchase'
        ? await getPurchase(db, factory.id, transactionId)
        : await getSale(db, factory.id, transactionId);
      if (!record || calculateLoanAtCreationMinor(record) <= 0) {
        throw new Error(fa.contacts.loanNotFound);
      }
      setTransaction(record);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setTransaction(null);
    } finally {
      setLoading(false);
    }
  }, [db, factory, kind, transactionId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (!kind) {
    return (
      <Screen>
        <ScreenHeader title={fa.contacts.loanHistory} onBack={() => router.back()} />
        <Card tone="danger">
          <ThemedText type="small">{fa.contacts.loanNotFound}</ThemedText>
        </Card>
      </Screen>
    );
  }

  const isPurchase = kind === 'purchase';
  const contactId = transaction
    ? 'supplierId' in transaction
      ? transaction.supplierId
      : transaction.customerId
    : null;
  const contactName = transaction
    ? 'supplierId' in transaction
      ? transaction.supplierName
      : transaction.customerName
    : '';
  const items = transaction
    ? 'supplierId' in transaction
      ? transaction.items.map((item) => item.rawMaterialName)
      : transaction.items.map((item) => item.finishedProductName)
    : [];
  const transactionDate = transaction
    ? 'supplierId' in transaction
      ? transaction.purchaseDate
      : transaction.saleDate
    : '';

  const openContactHistory = () => {
    if (!contactId) return;
    router.push({
      pathname: '/contact/[kind]/[id]',
      params: {
        kind: isPurchase ? 'supplier' : 'customer',
        id: contactId,
      },
    });
  };

  return (
    <Screen>
      <ScreenHeader title={fa.contacts.loanHistory} onBack={() => router.back()} />
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : null}
      {error ? (
        <Card tone="danger">
          <ThemedText type="small" style={{ color: theme.danger }}>{error}</ThemedText>
        </Card>
      ) : null}
      {!loading && transaction ? (
        <>
          <Card>
            <Pressable
              accessibilityRole="button"
              onPress={openContactHistory}
              style={({ pressed }) => [styles.contact, pressed && styles.pressed]}
            >
              <ContactAvatar
                name={contactName}
                photoUri={null}
                size={48}
              />
              <View style={styles.contactDetails}>
                <ThemedText type="smallBold">{contactName}</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {formatJalaliISODate(transactionDate)}
                </ThemedText>
              </View>
              <Badge
                tone={transaction.paymentStatus === 'paid'
                  ? 'success'
                  : transaction.paymentStatus === 'partial'
                    ? 'warning'
                    : 'danger'}
                label={transaction.paymentStatus === 'paid'
                  ? fa.purchases.paid
                  : transaction.paymentStatus === 'partial'
                    ? fa.purchases.partial
                    : fa.purchases.unpaid}
              />
            </Pressable>
            <ThemedText type="caption">
              {isPurchase ? fa.purchases.material : fa.sales.product}: {items.join('، ')}
            </ThemedText>
            <ThemedText type="caption">
              {fa.contacts.transactionTotal}: {formatMoney(
                transaction.totalOriginalMinor,
                transaction.currency
              )}
            </ThemedText>
            <ThemedText type="smallBold">
              {fa.contacts.loanOpened}: {formatMoney(
                calculateLoanAtCreationMinor(transaction),
                transaction.currency
              )}
            </ThemedText>
          </Card>

          <ThemedText type="subtitle">{fa.contacts.loanPayments}</ThemedText>
          {transaction.payments.length === 0 ? (
            <EmptyState title={fa.contacts.noLoanPayments} />
          ) : transaction.payments.map((payment, index) => (
            <Card key={`${payment.paidAt}-${index}`}>
              <View style={styles.paymentRow}>
                <ThemedText type="caption" themeColor="textSecondary">
                  {formatJalaliISODate(payment.paidAt)}
                </ThemedText>
                <ThemedText type="smallBold">
                  {formatMoney(payment.amountMinor, payment.currency)}
                </ThemedText>
              </View>
            </Card>
          ))}

          <Card tone={transaction.outstandingOriginalMinor > 0 ? 'warning' : 'success'}>
            <ThemedText type="smallBold">
              {fa.contacts.remainingLoan}: {formatMoney(
                transaction.outstandingOriginalMinor,
                transaction.currency
              )}
            </ThemedText>
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', paddingVertical: Spacing.two },
  contact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  contactDetails: { flex: 1, minWidth: 0, gap: Spacing.one },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  pressed: { opacity: 0.72 },
});
