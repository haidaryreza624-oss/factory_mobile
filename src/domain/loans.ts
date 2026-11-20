import type { Currency } from './money';

export interface LoanTransactionRecord {
  totalOriginalMinor: number;
  currency: Currency;
  createdAt: string;
  payments: {
    currency: Currency;
    amountMinor: number;
    paidAt: string;
  }[];
}

export function calculateLoanAtCreationMinor(
  transaction: LoanTransactionRecord
): number {
  const paidAtCreation = transaction.payments.reduce(
    (total, payment) => payment.paidAt === transaction.createdAt &&
      payment.currency === transaction.currency
      ? total + payment.amountMinor
      : total,
    0
  );
  return Math.max(0, transaction.totalOriginalMinor - paidAtCreation);
}
