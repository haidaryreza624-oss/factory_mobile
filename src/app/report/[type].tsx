import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ReportLineChart, type ReportTrendPoint } from '@/components/reports/report-line-chart';
import { ReportTable } from '@/components/reports/report-table';
import { TransactionFilters } from '@/components/reports/transaction-filters';
import { ThemedText } from '@/components/themed-text';
import type { BadgeTone } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Spacing } from '@/constants/theme';
import { getBusinessExpenses } from '@/db/repositories/finance';
import {
  getFinishedStockReportMovements,
  type FinishedStockReportMovement,
} from '@/db/repositories/reports';
import { getFinishedProducts, getProductionBatches } from '@/db/repositories/production';
import { getPurchases } from '@/db/repositories/purchases';
import { getSales } from '@/db/repositories/sales';
import { afnEquivalent } from '@/domain/money';
import { calculateLoanAtCreationMinor } from '@/domain/loans';
import type {
  BusinessExpense,
  FinishedProductStock,
  ProductionBatch,
  Purchase,
  Sale,
} from '@/db/types';
import { fa } from '@/i18n';
import { formatAfn, formatKg, formatMoney } from '@/lib/format';
import { formatJalaliISODate, formatJalaliMonthYear } from '@/lib/jalali';
import { getKabulDateISO } from '@/lib/time';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/providers/app-provider';
import { useDatabase } from '@/providers/database-provider';

const reportTypes = [
  'purchases',
  'sales',
  'purchase-loans',
  'sale-loans',
  'expenses',
  'production',
  'stock',
] as const;

type ReportType = typeof reportTypes[number];

function isReportType(value: string | undefined): value is ReportType {
  return reportTypes.includes(value as ReportType);
}

function getReportTitle(type: ReportType): string {
  switch (type) {
    case 'purchases': return fa.purchases.history;
    case 'sales': return fa.sales.history;
    case 'purchase-loans': return fa.reports.purchasesLoan;
    case 'sale-loans': return fa.reports.salesLoan;
    case 'expenses': return fa.reports.expenses;
    case 'production': return fa.reports.production;
    case 'stock': return fa.reports.finishedStock;
  }
}

function getChartTitle(type: ReportType): string {
  switch (type) {
    case 'purchases': return fa.reports.purchaseTrend;
    case 'sales': return fa.reports.saleTrend;
    case 'purchase-loans': return fa.reports.purchaseLoanTrend;
    case 'sale-loans': return fa.reports.saleLoanTrend;
    case 'expenses': return fa.reports.expensesTrend;
    case 'production': return fa.reports.productionTrend;
    case 'stock': return fa.reports.stockTrend;
  }
}

function localDateOf(date: string): string {
  return date.length > 10
    ? getKabulDateISO(new Date(date))
    : date;
}

function recentCutoff(latestDate: string): string {
  const cutoff = new Date(`${latestDate}T00:00:00.000Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - 30);
  return cutoff.toISOString().slice(0, 10);
}

function periodFor(date: string, cutoffDate: string): string {
  const localDate = localDateOf(date);
  return localDate < cutoffDate
    ? localDate.slice(0, 7)
    : localDate;
}

function formatPeriod(period: string): string {
  return period.length === 7
    ? formatJalaliMonthYear(`${period}-01T00:00:00.000Z`)
    : formatJalaliISODate(period);
}

function periodTotals(
  events: { date: string; value: number }[],
  unit: ReportTrendPoint['unit']
): ReportTrendPoint[] {
  const dates = events.map((event) => localDateOf(event.date)).sort();
  const latestDate = dates[dates.length - 1] ?? '';
  const cutoffDate = latestDate ? recentCutoff(latestDate) : '';
  const totals = new Map<string, number>();
  for (const event of events) {
    const period = periodFor(event.date, cutoffDate);
    totals.set(period, (totals.get(period) ?? 0) + event.value);
  }
  return Array.from(totals.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, value]) => ({ label: formatPeriod(period), value, unit }));
}

function periodBalances(
  events: { date: string; change: number }[],
  unit: ReportTrendPoint['unit'],
  clampAtZero = false
): ReportTrendPoint[] {
  const dates = events.map((event) => localDateOf(event.date)).sort();
  const latestDate = dates[dates.length - 1] ?? '';
  const cutoffDate = latestDate ? recentCutoff(latestDate) : '';
  const periodChanges = new Map<string, number>();
  for (const event of events) {
    const period = periodFor(event.date, cutoffDate);
    periodChanges.set(period, (periodChanges.get(period) ?? 0) + event.change);
  }

  let balance = 0;
  return Array.from(periodChanges.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, change]) => {
      balance += change;
      if (clampAtZero) balance = Math.max(0, balance);
      return { label: formatPeriod(period), value: balance, unit };
    });
}

function loanBalanceEvents<T extends {
  currency: Purchase['currency'];
  totalAfn: number;
  exchangeRateMilli: number | null;
  payments: Purchase['payments'];
}>(
  transactions: T[],
  dateOf: (transaction: T) => string
): { date: string; change: number }[] {
  return transactions.flatMap((transaction) => [
    { date: dateOf(transaction), change: transaction.totalAfn },
    ...transaction.payments.map((payment) => ({
      date: payment.paidAt,
      change: -afnEquivalent(
        transaction.currency,
        payment.amountMinor,
        payment.exchangeRateMilli ?? transaction.exchangeRateMilli ?? 1000
      ),
    })),
  ]);
}

function getPaymentBadge(status: Purchase['paymentStatus']): {
  label: string;
  tone: BadgeTone;
} {
  if (status === 'paid') {
    return { label: fa.reports.complete, tone: 'success' };
  }
  return {
    label: fa.reports.incomplete,
    tone: status === 'partial' ? 'warning' : 'danger',
  };
}

export default function ReportDetailScreen() {
  const { type: rawType } = useLocalSearchParams<{ type?: string }>();
  const type = isReportType(rawType) ? rawType : null;
  const db = useDatabase();
  const { factory } = useApp();
  const theme = useTheme();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<BusinessExpense[]>([]);
  const [production, setProduction] = useState<ProductionBatch[]>([]);
  const [stock, setStock] = useState<FinishedProductStock[]>([]);
  const [stockMovements, setStockMovements] = useState<FinishedStockReportMovement[]>([]);
  const [transactionSearch, setTransactionSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'complete' | 'incomplete'>('all');
  const [currencyFilter, setCurrencyFilter] = useState<'all' | 'AFN' | 'USD'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!factory || !type) {
      setLoading(false);
      setError(fa.reports.unknownReport);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      switch (type) {
        case 'purchases':
        case 'purchase-loans':
          setPurchases(await getPurchases(db, factory.id, null));
          break;
        case 'sales':
        case 'sale-loans':
          setSales(await getSales(db, factory.id, null));
          break;
        case 'expenses':
          setExpenses(await getBusinessExpenses(db, factory.id, null));
          break;
        case 'production':
          setProduction(await getProductionBatches(db, factory.id, null));
          break;
        case 'stock': {
          const [products, movements] = await Promise.all([
            getFinishedProducts(db, factory.id),
            getFinishedStockReportMovements(db, factory.id),
          ]);
          setStock(products);
          setStockMovements(movements);
          break;
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }, [db, factory, type]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const purchaseLoans = useMemo(
    () => purchases.filter((purchase) => purchase.outstandingOriginalMinor > 0),
    [purchases]
  );
  const saleLoans = useMemo(
    () => sales.filter((sale) => sale.outstandingOriginalMinor > 0),
    [sales]
  );
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

  const trendPoints = useMemo<ReportTrendPoint[]>(() => {
    switch (type) {
      case 'purchases':
        return periodTotals(filteredPurchases.map((purchase) => ({
          date: purchase.purchaseDate,
          value: purchase.totalAfn,
        })), 'AFN');
      case 'sales':
        return periodTotals(filteredSales.map((sale) => ({
          date: sale.saleDate,
          value: sale.totalAfn,
        })), 'AFN');
      case 'purchase-loans':
        return periodBalances(
          loanBalanceEvents(purchases, (purchase) => purchase.purchaseDate),
          'AFN',
          true
        );
      case 'sale-loans':
        return periodBalances(
          loanBalanceEvents(sales, (sale) => sale.saleDate),
          'AFN',
          true
        );
      case 'expenses':
        return periodTotals(expenses.map((expense) => ({
          date: expense.expenseDate,
          value: expense.amountAfn,
        })), 'AFN');
      case 'production':
        return periodTotals(production.map((batch) => ({
          date: batch.productionDate,
          value: batch.actualOutputGrams,
        })), 'KG');
      case 'stock':
        return periodBalances(stockMovements.map((movement) => ({
          date: movement.occurredAt,
          change: movement.quantityGrams,
        })), 'KG', true);
      default:
        return [];
    }
  }, [
    expenses,
    filteredPurchases,
    filteredSales,
    production,
    purchases,
    sales,
    stockMovements,
    type,
  ]);
  let headers: string[] = [];
  let rows: string[][] = [];
  let columnFlexes: number[] = [];
  let rowBadges: { label: string; tone: BadgeTone }[] = [];

  if (type === 'purchases') {
    headers = [
      fa.reports.date,
      `${fa.reports.supplier} / ${fa.reports.materials}`,
      fa.reports.total,
      fa.reports.status,
    ];
    columnFlexes = [0.8, 1.2, 1.2, 0.8];
    rows = filteredPurchases.map((purchase) => [
      formatJalaliISODate(purchase.purchaseDate),
      `${purchase.supplierName}\n${purchase.items.map((item) => item.rawMaterialName).join('، ')}`,
      purchase.outstandingOriginalMinor > 0
        ? `${formatMoney(purchase.totalOriginalMinor, purchase.currency)}\n${fa.reports.paid}: ${formatMoney(
            purchase.totalOriginalMinor - purchase.outstandingOriginalMinor,
            purchase.currency
          )}`
        : formatMoney(purchase.totalOriginalMinor, purchase.currency),
      '',
    ]);
    rowBadges = filteredPurchases.map((purchase) => getPaymentBadge(purchase.paymentStatus));
  } else if (type === 'sales') {
    headers = [
      fa.reports.date,
      `${fa.reports.customer} / ${fa.reports.products}`,
      fa.reports.total,
      fa.reports.status,
    ];
    columnFlexes = [0.8, 1.2, 1.2, 0.8];
    rows = filteredSales.map((sale) => [
      formatJalaliISODate(sale.saleDate),
      `${sale.customerName}\n${sale.items.map((item) => item.finishedProductName).join('، ')}`,
      sale.outstandingOriginalMinor > 0
        ? `${formatMoney(sale.totalOriginalMinor, sale.currency)}\n${fa.reports.paid}: ${formatMoney(
            sale.totalOriginalMinor - sale.outstandingOriginalMinor,
            sale.currency
          )}`
        : formatMoney(sale.totalOriginalMinor, sale.currency),
      '',
    ]);
    rowBadges = filteredSales.map((sale) => getPaymentBadge(sale.paymentStatus));
  } else if (type === 'purchase-loans') {
    headers = [
      fa.reports.date,
      `${fa.reports.supplier} / ${fa.reports.materials}`,
      fa.contacts.initialLoan,
      fa.contacts.remainingLoan,
    ];
    columnFlexes = [0.8, 1.3, 1, 1];
    rows = purchaseLoans.map((purchase) => [
      formatJalaliISODate(purchase.purchaseDate),
      `${purchase.supplierName}\n${purchase.items.map((item) => item.rawMaterialName).join('، ')}`,
      formatMoney(calculateLoanAtCreationMinor(purchase), purchase.currency),
      formatMoney(purchase.outstandingOriginalMinor, purchase.currency),
    ]);
  } else if (type === 'sale-loans') {
    headers = [
      fa.reports.date,
      `${fa.reports.customer} / ${fa.reports.products}`,
      fa.contacts.initialLoan,
      fa.contacts.remainingLoan,
    ];
    columnFlexes = [0.8, 1.3, 1, 1];
    rows = saleLoans.map((sale) => [
      formatJalaliISODate(sale.saleDate),
      `${sale.customerName}\n${sale.items.map((item) => item.finishedProductName).join('، ')}`,
      formatMoney(calculateLoanAtCreationMinor(sale), sale.currency),
      formatMoney(sale.outstandingOriginalMinor, sale.currency),
    ]);
  } else if (type === 'expenses') {
    headers = [fa.reports.date, `${fa.reports.category} / ${fa.reports.description}`, fa.reports.amount];
    columnFlexes = [0.8, 1.4, 1.1];
    rows = expenses.map((expense) => [
      formatJalaliISODate(expense.expenseDate),
      `${expense.categoryName}\n${expense.description || fa.common.notSet}${expense.notes ? `\n${expense.notes}` : ''}`,
      formatAfn(expense.amountAfn),
    ]);
  } else if (type === 'production') {
    headers = [fa.reports.date, fa.reports.input, `${fa.reports.output} / ${fa.reports.loss} / ${fa.reports.cost}`];
    columnFlexes = [0.8, 1.5, 1.4];
    rows = production.map((batch) => [
      formatJalaliISODate(batch.productionDate),
      batch.inputs.map((input) =>
        `${input.rawMaterialName}: ${formatKg(input.quantityGrams)}`
      ).join('، '),
      `${formatKg(batch.actualOutputGrams)}\n${fa.reports.loss}: ${formatKg(batch.actualLossGrams)}\n${formatAfn(batch.batchCostAfn)}`,
    ]);
  } else if (type === 'stock') {
    headers = [fa.reports.products, fa.reports.stock];
    columnFlexes = [1.5, 1];
    rows = stock.map((product) => [product.name, formatKg(product.balanceGrams)]);
  }

  const title = type ? getReportTitle(type) : fa.reports.title;
  const chartTitle = type ? getChartTitle(type) : fa.reports.progressOverTime;
  return (
    <Screen>
      <ScreenHeader title={title} onBack={() => router.back()} />
      {loading ? <View style={styles.loading}><ActivityIndicator color={theme.primary} /></View> : null}
      {error ? (
        <Card tone="danger">
          <ThemedText type="small" style={{ color: theme.danger }}>{error}</ThemedText>
        </Card>
      ) : null}
      {!loading && !error && type ? (
        <>
          {type === 'purchases' || type === 'sales' ? (
            <TransactionFilters
              search={transactionSearch}
              status={statusFilter}
              currency={currencyFilter}
              onSearchChange={setTransactionSearch}
              onStatusChange={setStatusFilter}
              onCurrencyChange={setCurrencyFilter}
            />
          ) : null}
          <ReportLineChart title={chartTitle} points={trendPoints} />
          {rows.length ? (
            <ReportTable
              headers={headers}
              rows={rows}
              columnFlexes={columnFlexes}
              rowBadges={rowBadges.length ? rowBadges : undefined}
              onRowPress={type === 'purchase-loans'
                ? (rowIndex) => {
                    const purchase = purchaseLoans[rowIndex];
                    if (purchase) {
                      router.push({
                        pathname: '/loan/[kind]/[id]',
                        params: { kind: 'purchase', id: purchase.id },
                      });
                    }
                  }
                : type === 'sale-loans'
                  ? (rowIndex) => {
                      const sale = saleLoans[rowIndex];
                      if (sale) {
                        router.push({
                          pathname: '/loan/[kind]/[id]',
                          params: { kind: 'sale', id: sale.id },
                        });
                      }
                    }
                  : undefined}
            />
          ) : (
            <EmptyState title={fa.reports.noRecords} />
          )}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', paddingVertical: Spacing.two },
});
