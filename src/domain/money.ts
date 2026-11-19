/**
 * Money and exchange-rate arithmetic.
 *
 * Every amount is an integer in its smallest unit:
 *   AFN → whole afghanis
 *   USD → cents
 *   quantities → grams
 *   rates → milli-AFN per USD (72.5 AFN/USD = 72_500)
 *
 * Nothing in this module imports React Native, so it can be unit tested in
 * plain Node and reused by the future sync layer.
 */

import { normalizeNumericInput, toAsciiDigits } from '../lib/persian';

export type Currency = 'AFN' | 'USD';
export type RoundingMode = 'truncate' | 'round';

export const DEFAULT_ROUNDING: RoundingMode = 'truncate';

const MAX_RATE_MILLI = 1_000_000_000;

export function assertValidRate(rateMilli: number): void {
  if (!Number.isInteger(rateMilli) || rateMilli <= 0) {
    throw new RangeError('rateMilli must be a positive integer');
  }
}

function applyRounding(value: number, mode: RoundingMode): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return mode === 'round' ? Math.round(value) : Math.trunc(value);
}

/** Converts USD cents to whole AFN using milli-AFN per USD. */
export function usdMinorToAfn(
  usdMinor: number,
  rateMilli: number,
  mode: RoundingMode = DEFAULT_ROUNDING
): number {
  assertValidRate(rateMilli);

  return applyRounding((usdMinor * rateMilli) / 100_000, mode);
}

/** Converts whole AFN to USD cents using milli-AFN per USD. */
export function afnToUsdMinor(
  afn: number,
  rateMilli: number,
  mode: RoundingMode = DEFAULT_ROUNDING
): number {
  assertValidRate(rateMilli);

  return applyRounding((afn * 100_000) / rateMilli, mode);
}

/**
 * The AFN value stored with a transaction. This is an accounting value and
 * never changes after posting, even when a newer rate is entered.
 */
export function afnEquivalent(
  currency: Currency,
  amountMinor: number,
  rateMilli: number
): number {
  return currency === 'AFN' ? amountMinor : usdMinorToAfn(amountMinor, rateMilli, 'round');
}

/** Trims a milli rate into an editable ASCII string: 72_000 → "72". */
export function rateMilliToInput(rateMilli: number): string {
  const whole = Math.trunc(rateMilli / 1000);
  const fraction = Math.abs(rateMilli % 1000);

  if (fraction === 0) {
    return String(whole);
  }

  return `${whole}.${String(fraction).padStart(3, '0').replace(/0+$/, '')}`;
}

function normalizedAmountCandidate(input: string): string {
  return toAsciiDigits(input)
    .replace(/[٬,\s]/g, '')
    .replace(/٫/g, '.');
}

const AMOUNT_PATTERN = /^\d+(\.\d+)?$/;

/** Parses a typed rate into milli-AFN, or null when invalid. */
export function parseRateToMilli(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === '') {
    return null;
  }

  const candidate = normalizedAmountCandidate(trimmed);
  if (!AMOUNT_PATTERN.test(candidate)) {
    return null;
  }

  const value = Number(candidate);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  const rateMilli = Math.round(value * 1000);
  if (rateMilli <= 0 || rateMilli > MAX_RATE_MILLI) {
    return null;
  }

  return rateMilli;
}

/** Parses typed AFN. An empty input means zero. Returns null when invalid. */
export function parseAfnInput(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === '') {
    return 0;
  }

  const candidate = normalizedAmountCandidate(trimmed);
  if (!AMOUNT_PATTERN.test(candidate)) {
    return null;
  }

  const value = Number(candidate);
  if (!Number.isFinite(value) || value < 0) {
    return null;
  }

  return Math.round(value);
}

/** Parses typed USD into cents. An empty input means zero. */
export function parseUsdInput(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === '') {
    return 0;
  }

  const candidate = normalizedAmountCandidate(trimmed);
  if (!AMOUNT_PATTERN.test(candidate)) {
    return null;
  }

  const value = Number(candidate);
  if (!Number.isFinite(value) || value < 0) {
    return null;
  }

  return Math.round(value * 100);
}

/** Parses typed kilograms into grams. */
export function parseKgInput(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === '') {
    return 0;
  }

  const candidate = normalizedAmountCandidate(trimmed);
  if (!AMOUNT_PATTERN.test(candidate)) {
    return null;
  }

  const value = Number(candidate);
  if (!Number.isFinite(value) || value < 0) {
    return null;
  }

  return Math.round(value * 1000);
}

/** Removes everything that is not a digit or a single decimal separator. */
export function sanitizeNumericInput(input: string): string {
  return normalizeNumericInput(input);
}
