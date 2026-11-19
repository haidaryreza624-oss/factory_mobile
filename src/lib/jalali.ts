/**
 * Solar Hijri (Jalali) formatting with Afghan Persian month names.
 *
 * Gregorian values are stored everywhere in the database. Conversion happens
 * only at the edge, for display.
 */

import { toJalaali } from 'jalaali-js';

import { toPersianDigits } from '@/lib/persian';
import { getKabulParts } from '@/lib/time';

export const AFGHAN_MONTHS = [
  'حمل',
  'ثور',
  'جوزا',
  'سرطان',
  'اسد',
  'سنبله',
  'میزان',
  'عقرب',
  'قوس',
  'جدی',
  'دلو',
  'حوت',
] as const;

const WEEKDAYS = [
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنجشنبه',
  'جمعه',
  'شنبه',
] as const;

export interface JalaliParts {
  jy: number;
  jm: number;
  jd: number;
  /** 0 = Sunday … 6 = Saturday */
  weekday: number;
}

export interface JalaliFormatOptions {
  withWeekday?: boolean;
  withYear?: boolean;
}

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

function fromGregorian(year: number, month: number, day: number): JalaliParts {
  const { jy, jm, jd } = toJalaali(year, month, day);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

  return { jy, jm, jd, weekday };
}

function formatParts(parts: JalaliParts, options: JalaliFormatOptions = {}): string {
  const { withWeekday = false, withYear = true } = options;
  const month = AFGHAN_MONTHS[parts.jm - 1] ?? '';
  const date = `${toPersianDigits(parts.jd)} ${month}${withYear ? ` ${toPersianDigits(parts.jy)}` : ''}`;

  return withWeekday ? `${WEEKDAYS[parts.weekday] ?? ''}، ${date}` : date;
}

/** Formats a JS Date using the Kabul calendar date. */
export function formatJalaliDate(date: Date = new Date(), options?: JalaliFormatOptions): string {
  const kabul = getKabulParts(date);
  return formatParts(fromGregorian(kabul.year, kabul.month, kabul.day), options);
}

/** Formats an already-local `YYYY-MM-DD` calendar date without shifting it. */
export function formatJalaliISODate(
  isoDate: string,
  options?: JalaliFormatOptions
): string {
  const [year, month, day] = isoDate.split('-').map(Number);

  if (!year || !month || !day) {
    return isoDate;
  }

  return formatParts(fromGregorian(year, month, day), options);
}

/** Formats a stored UTC timestamp as a Kabul local Jalali date. */
export function formatJalaliTimestamp(
  isoTimestamp: string,
  options?: JalaliFormatOptions
): string {
  return formatJalaliDate(new Date(isoTimestamp), options);
}

/** Formats a stored UTC timestamp as Kabul local 24-hour time. */
export function formatKabulTime(isoTimestamp: string | Date): string {
  const date = typeof isoTimestamp === 'string' ? new Date(isoTimestamp) : isoTimestamp;
  const kabul = getKabulParts(date);

  return `${toPersianDigits(pad2(kabul.hours))}:${toPersianDigits(pad2(kabul.minutes))}`;
}

export function formatJalaliDateTime(isoTimestamp: string): string {
  return `${formatJalaliTimestamp(isoTimestamp, { withWeekday: true })}، ساعت ${formatKabulTime(isoTimestamp)}`;
}

export function formatJalaliMonthYear(isoTimestamp: string | Date): string {
  const date = typeof isoTimestamp === 'string' ? new Date(isoTimestamp) : isoTimestamp;
  const kabul = getKabulParts(date);
  const parts = fromGregorian(kabul.year, kabul.month, kabul.day);

  return `${AFGHAN_MONTHS[parts.jm - 1]} ${toPersianDigits(parts.jy)}`;
}
