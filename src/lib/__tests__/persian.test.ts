import { describe, expect, it } from 'vitest';

import {
  groupAsciiInteger,
  normalizeNumericInput,
  normalizePersianText,
  toAsciiDigits,
  toPersianDigits,
} from '../persian';

describe('digit conversion', () => {
  it('converts ASCII digits to Persian digits', () => {
    expect(toPersianDigits(1234567890)).toBe('۱۲۳۴۵۶۷۸۹۰');
    expect(toPersianDigits('12 ریال')).toBe('۱۲ ریال');
  });

  it('converts Persian and Arabic-Indic digits to ASCII', () => {
    expect(toAsciiDigits('۱۲۳')).toBe('123');
    expect(toAsciiDigits('٤٥٦')).toBe('456');
    expect(toAsciiDigits('۱۲3')).toBe('123');
  });
});

describe('normalizeNumericInput', () => {
  it('handles Persian digits, separators and decimal marks', () => {
    expect(normalizeNumericInput('۱۲٬۳۴۵٫۶۷')).toBe('12345.67');
    expect(normalizeNumericInput('1,234.56')).toBe('1234.56');
    expect(normalizeNumericInput(' 500 ')).toBe('500');
  });

  it('keeps only the first decimal point', () => {
    expect(normalizeNumericInput('12.3.4')).toBe('12.34');
  });

  it('drops letters and symbols', () => {
    expect(normalizeNumericInput('۱۲۳ افغانی')).toBe('123');
    expect(normalizeNumericInput('abc')).toBe('');
  });
});

describe('normalizePersianText', () => {
  it('unifies Arabic letter variants', () => {
    expect(normalizePersianText('يك')).toBe('یک');
    expect(normalizePersianText('مي شود')).toBe('می شود');
    expect(normalizePersianText('كتاب')).toBe('کتاب');
  });

  it('removes diacritics and tatweel', () => {
    expect(normalizePersianText('مُحَمَّد')).toBe('محمد');
    expect(normalizePersianText('کــتاب')).toBe('کتاب');
  });

  it('turns zero-width non-joiners into spaces and collapses whitespace', () => {
    expect(normalizePersianText('می‌شود')).toBe('می شود');
    expect(normalizePersianText('  علی   رضا  ')).toBe('علی رضا');
  });
});

describe('groupAsciiInteger', () => {
  it('groups thousands with the Persian separator', () => {
    expect(groupAsciiInteger(0)).toBe('0');
    expect(groupAsciiInteger(999)).toBe('999');
    expect(groupAsciiInteger(1_000)).toBe('1٬000');
    expect(groupAsciiInteger(1_234_567)).toBe('1٬234٬567');
  });
});
