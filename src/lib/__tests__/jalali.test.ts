import { describe, expect, it } from 'vitest';

import {
  formatJalaliDate,
  formatJalaliDateTime,
  formatJalaliISODate,
  formatJalaliMonthYear,
  formatKabulTime,
} from '../jalali';
import { getKabulDateISO, isSameKabulDate } from '../time';
import { formatAfn, formatKg, formatPercent, formatRateLine, formatUsd } from '../format';

describe('Jalali formatting', () => {
  it('formats Gregorian ISO dates with Afghan month names', () => {
    expect(formatJalaliISODate('2026-03-21')).toBe('۱ حمل ۱۴۰۵');
    expect(formatJalaliISODate('2026-11-20')).toBe('۲۹ عقرب ۱۴۰۵');
  });

  it('can include the weekday', () => {
    expect(formatJalaliISODate('2026-03-21', { withWeekday: true })).toBe('شنبه، ۱ حمل ۱۴۰۵');
  });

  it('can omit the year', () => {
    expect(formatJalaliISODate('2026-03-21', { withYear: false })).toBe('۱ حمل');
  });

  it('returns the input when the date is malformed', () => {
    expect(formatJalaliISODate('not-a-date')).toBe('not-a-date');
  });

  it('shifts UTC timestamps to Kabul time before converting', () => {
    // 20:00 UTC on 20 March is 00:30 on 21 March in Kabul.
    const lateUtc = new Date('2026-03-20T20:00:00.000Z');
    expect(getKabulDateISO(lateUtc)).toBe('2026-03-21');
    expect(formatJalaliDate(lateUtc)).toBe('۱ حمل ۱۴۰۵');
    expect(isSameKabulDate('2026-03-21', lateUtc)).toBe(true);
  });

  it('formats Kabul time in 24-hour Persian digits', () => {
    expect(formatKabulTime('2026-03-21T20:00:00.000Z')).toBe('۰۰:۳۰');
    expect(formatKabulTime('2026-03-21T08:05:00.000Z')).toBe('۱۲:۳۵');
  });

  it('formats a full Jalali date-time', () => {
    expect(formatJalaliDateTime('2026-03-21T08:05:00.000Z')).toBe(
      'شنبه، ۱ حمل ۱۴۰۵، ساعت ۱۲:۳۵'
    );
  });

  it('formats month and year', () => {
    expect(formatJalaliMonthYear('2026-11-20T00:00:00.000Z')).toBe('عقرب ۱۴۰۵');
  });
});

describe('presentation formatting', () => {
  it('formats AFN with grouped Persian digits', () => {
    expect(formatAfn(1_234_567)).toBe('۱٬۲۳۴٬۵۶۷ افغانی');
    expect(formatAfn(0)).toBe('۰ افغانی');
  });

  it('formats USD with optional cents', () => {
    expect(formatUsd(50_050)).toBe('۵۰۰٫۵۰ دالر');
    expect(formatUsd(50_000)).toBe('۵۰۰ دالر');
    expect(formatUsd(1)).toBe('۰٫۰۱ دالر');
  });

  it('formats a rate line', () => {
    expect(formatRateLine(72_000)).toBe('۱ دالر = ۷۲ افغانی');
    expect(formatRateLine(72_500)).toBe('۱ دالر = ۷۲٫۵ افغانی');
  });

  it('formats kilograms and percentages', () => {
    expect(formatKg(1_500)).toBe('۱٫۵ کیلوگرم');
    expect(formatKg(2_000)).toBe('۲ کیلوگرم');
    expect(formatPercent(12.5, 1)).toBe('۱۲٫۵٪');
  });
});
