/**
 * Presentation helpers. All values entering these functions are integers in
 * their smallest unit (AFN whole units, USD cents, grams, milli-AFN).
 */

import { fa } from '@/i18n';
import type { Currency } from '@/domain/money';
import { rateMilliToInput } from '@/domain/money';
import { groupAsciiInteger, toPersianDigits } from '@/lib/persian';

function signOf(value: number): string {
  return value < 0 ? '−' : '';
}

export function formatCount(value: number): string {
  return toPersianDigits(groupAsciiInteger(value));
}

export function formatAfn(amount: number): string {
  return `${signOf(amount)}${toPersianDigits(groupAsciiInteger(amount))} ${fa.units.afn}`;
}

export function formatUsd(cents: number): string {
  const dollars = Math.trunc(cents / 100);
  const fraction = Math.abs(cents % 100);
  const fractionText = fraction === 0 ? '' : `٫${toPersianDigits(String(fraction).padStart(2, '0'))}`;

  return `${signOf(cents)}${toPersianDigits(groupAsciiInteger(dollars))}${fractionText} ${fa.units.usd}`;
}

export function formatMoney(minor: number, currency: Currency): string {
  return currency === 'USD' ? formatUsd(minor) : formatAfn(minor);
}

export function formatRate(rateMilli: number): string {
  return toPersianDigits(rateMilliToInput(rateMilli).replace('.', '٫'));
}

export function formatRateLine(rateMilli: number): string {
  return `۱ ${fa.units.usd} = ${formatRate(rateMilli)} ${fa.units.afn}`;
}

export function formatKg(grams: number): string {
  const whole = Math.trunc(Math.abs(grams) / 1000);
  const fraction = Math.abs(grams % 1000);
  const fractionText =
    fraction === 0 ? '' : `٫${toPersianDigits(String(fraction).padStart(3, '0').replace(/0+$/, ''))}`;

  return `${signOf(grams)}${toPersianDigits(groupAsciiInteger(whole))}${fractionText} ${fa.common.kg}`;
}

export function formatPercent(value: number, digits = 0): string {
  return `${toPersianDigits(value.toFixed(digits).replace('.', '٫'))}٪`;
}
