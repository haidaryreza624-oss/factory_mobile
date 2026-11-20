import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ContactAvatar } from '@/components/contacts/contact-avatar';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Spacing } from '@/constants/theme';
import { getSuppliers, getPurchasesForSupplier } from '@/db/repositories/purchases';
import { getCustomers, getSalesForCustomer } from '@/db/repositories/sales';
import type {
  Customer,
  Purchase,
  Sale,
  Supplier,
} from '@/db/types';
import { calculateLoanAtCreationMinor } from '@/domain/loans';
import { fa } from '@/i18n';
import { formatJalaliISODate } from '@/lib/jalali';
import { formatMoney } from '@/lib/format';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/providers/app-provider';
import { useDatabase } from '@/providers/database-provider';

type ContactKind = 'supplier' | 'customer';
type ContactRecord = Supplier | Customer;
type ContactTransaction = Purchase | Sale;

function isContactKind(value: string | undefined): value is ContactKind {
  return value === 'supplier' || value === 'customer';
}

function summarizeByCurrency(
  transactions: ContactTransaction[],
  valueOf: (transaction: ContactTransaction) => number
): string[] {
  return (['AFN', 'USD'] as const)
    .map((currency) => {
      const total = transactions.reduce(
        (sum, transaction) => transaction.currency === currency
          ? sum + valueOf(transaction)
          : sum,
        0
      );
      return total > 0 ? formatMoney(total, currency) : null;
    })
    .filter((value): value is string => value !== null);
}

export default function ContactTransactionIndexScreen() {
  const { kind: rawKind, id: rawId } = useLocalSearchParams<{
    kind?: string;
    id?: string;
  }>();
  const kind = isContactKind(rawKind) ? rawKind : null;
  const contactId = typeof rawId === 'string' ? rawId : null;
  const db = useDatabase();
  const { factory } = useApp();
  const theme = useTheme();
  const [contact, setContact] = useState<ContactRecord | null>(null);
  const [transactions, setTransactions] = useState<ContactTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!factory || !kind || !contactId) {
      setLoading(false);
      setError(fa.contacts.contactNotFound);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (kind === 'supplier') {
        const [contacts, purchases] = await Promise.all([
          getSuppliers(db, factory.id, true),
          getPurchasesForSupplier(db, factory.id, contactId),
        ]);
        setContact(contacts.find((item) => item.id === contactId) ?? null);
        setTransactions(purchases);
        if (!contacts.some((item) => item.id === contactId)) {
          throw new Error(fa.contacts.contactNotFound);
        }
      } else {
        const [contacts, sales] = await Promise.all([
          getCustomers(db, factory.id, true),
          getSalesForCustomer(db, factory.id, contactId),
        ]);
        setContact(contacts.find((item) => item.id === contactId) ?? null);
        setTransactions(sales);
        if (!contacts.some((item) => item.id === contactId)) {
          throw new Error(fa.contacts.contactNotFound);
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }, [contactId, db, factory, kind]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const loanTransactions = useMemo(
    () => transactions.filter(
      (transaction) => calculateLoanAtCreationMinor(transaction) > 0
    ),
    [transactions]
  );
  const originalLoans = summarizeByCurrency(
    loanTransactions,
    calculateLoanAtCreationMinor
  );
  const remainingLoans = summarizeByCurrency(
    loanTransactions,
    (transaction) => transaction.outstandingOriginalMinor
  );

  if (!kind) {
    return (
      <Screen>
        <ScreenHeader title={fa.contacts.transactions} onBack={() => router.back()} />
        <Card tone="danger">
          <ThemedText type="small">{fa.contacts.contactNotFound}</ThemedText>
        </Card>
      </Screen>
    );
  }

  const pageTitle = kind === 'supplier'
    ? fa.contacts.supplierTransactions
    : fa.contacts.customerTransactions;
  const transactionLabel = kind === 'supplier'
    ? fa.purchases.history
    : fa.sales.history;
  const loanLabel = kind === 'supplier'
    ? fa.reports.purchasesLoan
    : fa.reports.salesLoan;

  return (
    <Screen>
      <ScreenHeader title={pageTitle} onBack={() => router.back()} />
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
      {contact ? (
        <Card>
          <View style={styles.contactHeader}>
            <ContactAvatar name={contact.name} photoUri={contact.photoUri} size={56} />
            <View style={styles.contactDetails}>
              <ThemedText type="subtitle">{contact.name}</ThemedText>
              {contact.phone ? (
                <ThemedText type="caption" themeColor="textSecondary">
                  {contact.phone}
                </ThemedText>
              ) : null}
              {contact.address ? (
                <ThemedText type="caption" themeColor="textSecondary">
                  {contact.address}
                </ThemedText>
              ) : null}
            </View>
          </View>
        </Card>
      ) : null}

      {!loading && !error ? (
        <>
          <Card>
            <ThemedText type="smallBold">{loanLabel}</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {fa.contacts.loanOpened}: {originalLoans.length ? originalLoans.join(' · ') : formatMoney(0, 'AFN')}
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {fa.contacts.remainingLoan}: {remainingLoans.length ? remainingLoans.join(' · ') : formatMoney(0, 'AFN')}
            </ThemedText>
          </Card>

          <ThemedText type="subtitle">{transactionLabel}</ThemedText>
          {transactions.length === 0 ? (
            <EmptyState title={fa.contacts.noTransactions} />
          ) : transactions.map((transaction) => (
            <Card key={transaction.id}>
              <View style={styles.transactionHeader}>
                <View style={styles.transactionDetails}>
                  <ThemedText type="smallBold">
                    {formatJalaliISODate(
                      'supplierId' in transaction
                        ? transaction.purchaseDate
                        : transaction.saleDate
                    )}
                  </ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary">
                    {'supplierId' in transaction
                      ? transaction.items
                        .map((item) => item.rawMaterialName).join('، ')
                      : transaction.items
                        .map((item) => item.finishedProductName).join('، ')}
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
              </View>
              <ThemedText type="caption">
                {fa.contacts.transactionTotal}: {formatMoney(
                  transaction.totalOriginalMinor,
                  transaction.currency
                )}
              </ThemedText>
              {calculateLoanAtCreationMinor(transaction) > 0 ? (
                <ThemedText type="caption">
                  {fa.contacts.loanOpened}: {formatMoney(
                    calculateLoanAtCreationMinor(transaction),
                    transaction.currency
                  )}
                </ThemedText>
              ) : null}
              {transaction.payments.length > 0 ? (
                <View style={styles.payments}>
                  <ThemedText type="caption" themeColor="textSecondary">
                    {fa.contacts.loanPayments}
                  </ThemedText>
                  {transaction.payments.map((payment, index) => (
                    <ThemedText
                      key={`${payment.paidAt}-${index}`}
                      type="caption"
                      themeColor="textSecondary"
                    >
                      {formatJalaliISODate(payment.paidAt)} · {formatMoney(
                        payment.amountMinor,
                        payment.currency
                      )}
                    </ThemedText>
                  ))}
                </View>
              ) : null}
              <ThemedText type="smallBold">
                {fa.contacts.remainingLoan}: {formatMoney(
                  transaction.outstandingOriginalMinor,
                  transaction.currency
                )}
              </ThemedText>
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', paddingVertical: Spacing.two },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  contactDetails: { flex: 1, minWidth: 0, gap: Spacing.one },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  transactionDetails: { flex: 1, minWidth: 0, gap: Spacing.one },
  payments: { gap: Spacing.one },
});
