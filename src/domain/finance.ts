export function validateFinanceAmountAfn(amount: number): void {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new RangeError('Finance amount must be a positive whole AFN value.');
  }
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
