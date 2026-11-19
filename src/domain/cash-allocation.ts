/**
 * Cash allocation for a sale or purchase payment (spec §10.4–10.7).
 *
 * The transaction currency and the currency physically paid are different
 * ideas. This function answers one question: when money is received or paid,
 * how much lands in the AFN cash box and how much lands in the USD cash box?
 *
 * The rules, in the owner's words:
 *
 *  - USD paid in USD: whole dollars go to USD cash; the cents remainder is
 *    converted to AFN and goes to AFN cash.
 *  - USD paid in AFN: the whole USD value is converted to AFN cash.
 *  - AFN paid in AFN: everything goes to AFN cash.
 *  - AFN paid in USD: convert to whole dollars for USD cash; the leftover
 *    AFN value stays in AFN cash.
 *
 * This module is intentionally framework-free.
 */

import {
  type Currency,
  type RoundingMode,
  DEFAULT_ROUNDING,
  assertValidRate,
  usdMinorToAfn,
} from './money';

export interface CashAllocation {
  /** Positive inflow / outflow amount in whole AFN. */
  afnMinor: number;
  /** Positive inflow / outflow amount in USD cents. */
  usdMinor: number;
}

export interface PaymentAllocationInput {
  transactionCurrency: Currency;
  /** Transaction amount in its own smallest unit (AFN or USD cents). */
  transactionAmountMinor: number;
  paymentCurrency: Currency;
  /** AFN per USD × 1000. */
  rateMilli: number;
  rounding?: RoundingMode;
}

export function allocatePayment({
  transactionCurrency,
  transactionAmountMinor,
  paymentCurrency,
  rateMilli,
  rounding = DEFAULT_ROUNDING,
}: PaymentAllocationInput): CashAllocation {
  assertValidRate(rateMilli);

  if (!Number.isInteger(transactionAmountMinor) || transactionAmountMinor < 0) {
    throw new RangeError('transactionAmountMinor must be a non-negative integer');
  }

  if (paymentCurrency === 'AFN') {
    if (transactionCurrency === 'AFN') {
      return { afnMinor: transactionAmountMinor, usdMinor: 0 };
    }

    return {
      afnMinor: usdMinorToAfn(transactionAmountMinor, rateMilli, rounding),
      usdMinor: 0,
    };
  }

  if (transactionCurrency === 'USD') {
    const usdMinor = Math.floor(transactionAmountMinor / 100) * 100;
    const centsRemainder = transactionAmountMinor - usdMinor;

    return {
      afnMinor: usdMinorToAfn(centsRemainder, rateMilli, rounding),
      usdMinor,
    };
  }

  const wholeDollars = Math.floor((transactionAmountMinor * 1000) / rateMilli);
  const usdMinor = wholeDollars * 100;
  const afnConsumed = Math.round((wholeDollars * rateMilli) / 1000);

  return {
    afnMinor: Math.max(0, transactionAmountMinor - afnConsumed),
    usdMinor,
  };
}
