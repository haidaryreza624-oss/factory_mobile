import { describe, expect, it } from 'vitest';

import { calculateLoanAtCreationMinor } from '../loans';

describe('loan history', () => {
  it('records only the unpaid amount when the transaction is created as the loan', () => {
    expect(calculateLoanAtCreationMinor({
      totalOriginalMinor: 50_000,
      currency: 'AFN',
      createdAt: '2026-11-20T08:00:00.000Z',
      payments: [
        {
          currency: 'AFN',
          amountMinor: 25_000,
          paidAt: '2026-11-20T08:00:00.000Z',
        },
        {
          currency: 'AFN',
          amountMinor: 10_000,
          paidAt: '2026-11-21T08:00:00.000Z',
        },
      ],
    })).toBe(25_000);
  });

  it('does not classify a transaction paid in full at creation as a loan', () => {
    expect(calculateLoanAtCreationMinor({
      totalOriginalMinor: 50_000,
      currency: 'AFN',
      createdAt: '2026-11-20T08:00:00.000Z',
      payments: [{
        currency: 'AFN',
        amountMinor: 50_000,
        paidAt: '2026-11-20T08:00:00.000Z',
      }],
    })).toBe(0);
  });
});
