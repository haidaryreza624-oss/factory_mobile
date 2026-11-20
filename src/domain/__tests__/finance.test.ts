import { describe, expect, it } from 'vitest';

import {
  applyOriginalCurrencyPayment,
  applyPaymentToBalance,
  calculatePersonalBalance,
  validateFinanceAmountAfn,
} from '../finance';

describe('finance calculations', () => {
  it('calculates personal income minus expenses', () => {
    expect(calculatePersonalBalance([
      { transactionType: 'income', amountAfn: 10_000 },
      { transactionType: 'expense', amountAfn: 2_500 },
    ])).toBe(7_500);
  });

  it('accepts only positive whole AFN amounts', () => {
    expect(() => validateFinanceAmountAfn(1)).not.toThrow();
    expect(() => validateFinanceAmountAfn(0)).toThrow(RangeError);
    expect(() => validateFinanceAmountAfn(-1)).toThrow(RangeError);
  });

  it('applies a partial payment and keeps the remaining receivable', () => {
    expect(applyPaymentToBalance(10_000, 2_000, 3_000)).toEqual({
      paidAfn: 5_000,
      outstandingAfn: 5_000,
      paymentStatus: 'partial',
    });
  });

  it('marks a balance paid when the final payment settles it', () => {
    expect(applyPaymentToBalance(10_000, 2_000, 8_000)).toEqual({
      paidAfn: 10_000,
      outstandingAfn: 0,
      paymentStatus: 'paid',
    });
  });

  it('rejects a payment larger than the remaining balance', () => {
    expect(() => applyPaymentToBalance(10_000, 9_000, 1_001)).toThrow(RangeError);
  });

  it('keeps a partial loan balance in its original currency', () => {
    expect(applyOriginalCurrencyPayment(10_000, 4_000, 2_500)).toEqual({
      paidOriginalMinor: 6_500,
      outstandingOriginalMinor: 3_500,
      paymentStatus: 'partial',
    });
  });

  it('settles an original-currency loan independently of its AFN equivalent', () => {
    expect(applyOriginalCurrencyPayment(10_000, 4_000, 6_000)).toEqual({
      paidOriginalMinor: 10_000,
      outstandingOriginalMinor: 0,
      paymentStatus: 'paid',
    });
  });

  it('rejects a payment larger than the original-currency loan balance', () => {
    expect(() => applyOriginalCurrencyPayment(10_000, 9_000, 1_001)).toThrow(RangeError);
  });
});
