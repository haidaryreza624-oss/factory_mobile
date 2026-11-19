import { describe, expect, it } from 'vitest';

import { allocatePayment } from '../cash-allocation';

const RATE = 72_000; // 72 AFN per USD

describe('allocatePayment', () => {
  it('keeps whole dollars in USD cash and converts the cents remainder to AFN', () => {
    // Spec example: $100.50 paid in USD at 72.
    const result = allocatePayment({
      transactionCurrency: 'USD',
      transactionAmountMinor: 10_050,
      paymentCurrency: 'USD',
      rateMilli: RATE,
    });

    expect(result).toEqual({ usdMinor: 10_000, afnMinor: 36 });
  });

  it('keeps whole dollars untouched when there are no cents', () => {
    const result = allocatePayment({
      transactionCurrency: 'USD',
      transactionAmountMinor: 10_000,
      paymentCurrency: 'USD',
      rateMilli: RATE,
    });

    expect(result).toEqual({ usdMinor: 10_000, afnMinor: 0 });
  });

  it('converts the whole USD amount to AFN when paid in AFN', () => {
    const result = allocatePayment({
      transactionCurrency: 'USD',
      transactionAmountMinor: 10_000,
      paymentCurrency: 'AFN',
      rateMilli: RATE,
    });

    expect(result).toEqual({ usdMinor: 0, afnMinor: 7_200 });
  });

  it('turns AFN paid in USD into whole dollars plus the AFN remainder', () => {
    // Spec example: 10,000 AFN paid in USD at 72.
    const result = allocatePayment({
      transactionCurrency: 'AFN',
      transactionAmountMinor: 10_000,
      paymentCurrency: 'USD',
      rateMilli: RATE,
    });

    expect(result).toEqual({ usdMinor: 13_800, afnMinor: 64 });
  });

  it('keeps AFN paid in AFN entirely in the AFN cash box', () => {
    const result = allocatePayment({
      transactionCurrency: 'AFN',
      transactionAmountMinor: 5_000,
      paymentCurrency: 'AFN',
      rateMilli: RATE,
    });

    expect(result).toEqual({ usdMinor: 0, afnMinor: 5_000 });
  });

  it('uses truncation by default for the cents remainder', () => {
    // $0.01 at 72 is 0.72 AFN; truncate keeps 0.
    const truncated = allocatePayment({
      transactionCurrency: 'USD',
      transactionAmountMinor: 1,
      paymentCurrency: 'USD',
      rateMilli: RATE,
    });

    const rounded = allocatePayment({
      transactionCurrency: 'USD',
      transactionAmountMinor: 1,
      paymentCurrency: 'USD',
      rateMilli: RATE,
      rounding: 'round',
    });

    expect(truncated.afnMinor).toBe(0);
    expect(rounded.afnMinor).toBe(1);
  });

  it('never leaves more AFN value than was paid', () => {
    const result = allocatePayment({
      transactionCurrency: 'AFN',
      transactionAmountMinor: 71,
      paymentCurrency: 'USD',
      rateMilli: RATE,
    });

    // 71 AFN buys zero whole dollars, so every afghani stays in AFN cash.
    expect(result).toEqual({ usdMinor: 0, afnMinor: 71 });
  });

  it('rejects negative amounts and invalid rates', () => {
    expect(() =>
      allocatePayment({
        transactionCurrency: 'AFN',
        transactionAmountMinor: -1,
        paymentCurrency: 'AFN',
        rateMilli: RATE,
      })
    ).toThrow(RangeError);

    expect(() =>
      allocatePayment({
        transactionCurrency: 'AFN',
        transactionAmountMinor: 100,
        paymentCurrency: 'AFN',
        rateMilli: 0,
      })
    ).toThrow(RangeError);
  });
});
