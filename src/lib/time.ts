/**
 * Date/time helpers for the factory's local time zone.
 *
 * The first release targets one factory in Afghanistan. Kabul is UTC+4:30
 * all year round (Afghanistan has not observed daylight saving time since
 * 1945), so a fixed offset is both correct and free of `Intl` differences
 * between Hermes versions.
 */

export const KABUL_OFFSET_MINUTES = 270;
export const KABUL_TIME_ZONE = 'Asia/Kabul';

export interface KabulDateParts {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  /** 0 = Sunday … 6 = Saturday */
  weekday: number;
}

export function getKabulParts(date: Date = new Date()): KabulDateParts {
  const shifted = new Date(date.getTime() + KABUL_OFFSET_MINUTES * 60_000);

  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
    weekday: shifted.getUTCDay(),
  };
}

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/** The calendar date as `YYYY-MM-DD` in Kabul time. */
export function getKabulDateISO(date: Date = new Date()): string {
  const parts = getKabulParts(date);
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

export function toUtcIso(date: Date = new Date()): string {
  return date.toISOString();
}

export function isSameKabulDate(a: Date | string, b: Date | string): boolean {
  const left = typeof a === 'string' ? a : getKabulDateISO(a);
  const right = typeof b === 'string' ? b : getKabulDateISO(b);
  return left === right;
}
