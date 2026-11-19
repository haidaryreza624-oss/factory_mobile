import { describe, expect, it } from 'vitest';

import { calculatePersonalBalance, validateFinanceAmountAfn } from '../finance';

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
});
