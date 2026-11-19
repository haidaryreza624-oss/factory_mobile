import { describe, expect, it } from 'vitest';

import {
  afnEquivalent,
  afnToUsdMinor,
  parseAfnInput,
  parseKgInput,
  parseRateToMilli,
  parseUsdInput,
  rateMilliToInput,
  usdMinorToAfn,
} from '../money';

describe('parseRateToMilli', () => {
  it('accepts ASCII and Persian digits', () => {
    expect(parseRateToMilli('72')).toBe(72_000);
    expect(parseRateToMilli('۷۲')).toBe(72_000);
    expect(parseRateToMilli('72.5')).toBe(72_500);
    expect(parseRateToMilli('۷۲٫۵')).toBe(72_500);
    expect(parseRateToMilli('1,234.567')).toBe(1_234_567);
  });

  it('rejects empty, zero, negative and non-numeric input', () => {
    expect(parseRateToMilli('')).toBeNull();
    expect(parseRateToMilli('   ')).toBeNull();
    expect(parseRateToMilli('0')).toBeNull();
    expect(parseRateToMilli('-72')).toBeNull();
    expect(parseRateToMilli('abc')).toBeNull();
    expect(parseRateToMilli('72 AFN')).toBeNull();
  });
});

describe('parseAfnInput and parseUsdInput', () => {
  it('treats empty input as zero', () => {
    expect(parseAfnInput('')).toBe(0);
    expect(parseUsdInput('')).toBe(0);
  });

  it('parses grouped Persian amounts', () => {
    expect(parseAfnInput('۱۰٬۰۰۰')).toBe(10_000);
    expect(parseAfnInput('1234567')).toBe(1_234_567);
  });

  it('parses USD into cents', () => {
    expect(parseUsdInput('500.50')).toBe(50_050);
    expect(parseUsdInput('۵۰۰٫۵۰')).toBe(50_050);
    expect(parseUsdInput('0.01')).toBe(1);
  });

  it('rounds fractional AFN to whole afghanis', () => {
    expect(parseAfnInput('10.4')).toBe(10);
    expect(parseAfnInput('10.6')).toBe(11);
  });

  it('rejects invalid and negative values', () => {
    expect(parseAfnInput('12.3.4')).toBeNull();
    expect(parseAfnInput('-5')).toBeNull();
    expect(parseUsdInput('abc')).toBeNull();
    expect(parseUsdInput('-1')).toBeNull();
  });
});

describe('parseKgInput', () => {
  it('parses kilograms into grams', () => {
    expect(parseKgInput('1.5')).toBe(1_500);
    expect(parseKgInput('۲٫۲۵')).toBe(2_250);
    expect(parseKgInput('')).toBe(0);
  });
});

describe('rateMilliToInput', () => {
  it('renders trimmed decimal strings', () => {
    expect(rateMilliToInput(72_000)).toBe('72');
    expect(rateMilliToInput(72_500)).toBe('72.5');
    expect(rateMilliToInput(72_050)).toBe('72.05');
    expect(rateMilliToInput(72_123)).toBe('72.123');
  });
});

describe('money conversion', () => {
  it('converts USD cents to AFN', () => {
    expect(usdMinorToAfn(10_000, 72_000)).toBe(7_200);
    expect(usdMinorToAfn(1, 72_000)).toBe(0);
  });

  it('converts AFN to USD cents', () => {
    expect(afnToUsdMinor(10_000, 72_000)).toBe(13_888);
  });

  it('snapshots the rounded AFN equivalent of a USD transaction', () => {
    expect(afnEquivalent('AFN', 5_000, 72_000)).toBe(5_000);
    expect(afnEquivalent('USD', 10_000, 72_000)).toBe(7_200);
    expect(afnEquivalent('USD', 1, 72_000)).toBe(1);
  });

  it('rejects a zero rate', () => {
    expect(() => usdMinorToAfn(100, 0)).toThrow(RangeError);
    expect(() => afnToUsdMinor(100, 0)).toThrow(RangeError);
  });
});
