export function validateFinanceAmountAfn(amount: number): void {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new RangeError('Finance amount must be a positive whole AFN value.');
  }
}

export interface PaymentBalance {
  paidAfn: number;
  outstandingAfn: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
}

export interface OriginalPaymentBalance {
  paidOriginalMinor: number;
  outstandingOriginalMinor: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
}

export function applyOriginalCurrencyPayment(
  totalOriginalMinor: number,
  paidOriginalMinor: number,
  paymentMinor: number
): OriginalPaymentBalance {
  const values = [totalOriginalMinor, paidOriginalMinor, paymentMinor];
  if (
    values.some((value) => !Number.isSafeInteger(value)) ||
    totalOriginalMinor < 0 ||
    paidOriginalMinor < 0 ||
    paymentMinor < 0 ||
    paidOriginalMinor > totalOriginalMinor ||
    paymentMinor > totalOriginalMinor - paidOriginalMinor
  ) {
    throw new RangeError('Payment exceeds the original-currency balance.');
  }

  const nextPaidOriginalMinor = paidOriginalMinor + paymentMinor;
  const outstandingOriginalMinor = totalOriginalMinor - nextPaidOriginalMinor;
  return {
    paidOriginalMinor: nextPaidOriginalMinor,
    outstandingOriginalMinor,
    paymentStatus:
      nextPaidOriginalMinor === 0
        ? 'unpaid'
        : outstandingOriginalMinor === 0
          ? 'paid'
          : 'partial',
  };
}

export function applyPaymentToBalance(
  totalAfn: number,
  paidAfn: number,
  paymentAfn: number
): PaymentBalance {
  if (
    !Number.isSafeInteger(totalAfn) ||
    !Number.isSafeInteger(paidAfn) ||
    !Number.isSafeInteger(paymentAfn) ||
    totalAfn < 0 ||
    paidAfn < 0 ||
    paymentAfn <= 0 ||
    paidAfn > totalAfn ||
    paymentAfn > totalAfn - paidAfn
  ) {
    throw new RangeError('Payment exceeds the outstanding balance.');
  }

  const nextPaidAfn = paidAfn + paymentAfn;
  const outstandingAfn = totalAfn - nextPaidAfn;
  return {
    paidAfn: nextPaidAfn,
    outstandingAfn,
    paymentStatus:
      outstandingAfn === 0 ? 'paid' : nextPaidAfn === 0 ? 'unpaid' : 'partial',
  };
}

export function calculatePersonalBalance(
  transactions: { transactionType: 'income' | 'expense'; amountAfn: number }[]
): number {
  return transactions.reduce(
    (balance, transaction) =>
      balance + (transaction.transactionType === 'income' ? transaction.amountAfn : -transaction.amountAfn),
    0
  );
}
