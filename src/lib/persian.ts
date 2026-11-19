/**
 * Persian text and digit helpers.
 *
 * Money and quantities are always stored as plain integers. These helpers
 * only convert what the owner types and what the owner reads.
 */

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const ARABIC_INDIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

const PERSIAN_DIGIT_PATTERN = /[۰-۹]/g;
const ARABIC_INDIC_DIGIT_PATTERN = /[٠-٩]/g;

/** Converts Persian (۰-۹) and Arabic-Indic (٠-٩) digits to ASCII digits. */
export function toAsciiDigits(input: string): string {
  return input
    .replace(PERSIAN_DIGIT_PATTERN, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(ARABIC_INDIC_DIGIT_PATTERN, (digit) => String(digit.charCodeAt(0) - 0x0660));
}

/** Converts ASCII digits in any string to Persian digits. */
export function toPersianDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (digit) => PERSIAN_DIGITS[Number(digit)]);
}

/**
 * Normalizes typed numeric input.
 *
 * Accepts Persian/Arabic digits, Persian decimal separator (٫), spaces and
 * thousands separators. Returns a plain ASCII number fragment that can be
 * passed to `Number()` — or an empty string when nothing numeric is left.
 */
export function normalizeNumericInput(input: string): string {
  const cleaned = toAsciiDigits(input)
    .replace(/[٬,\s]/g, '')
    .replace(/٫/g, '.')
    .replace(/[^0-9.]/g, '');

  const firstDot = cleaned.indexOf('.');
  if (firstDot === -1) {
    return cleaned;
  }

  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
}

/**
 * Normalizes Persian text for searching and comparison.
 *
 * Handles the common Arabic/Persian letter variants, removes diacritics and
 * tatweel, and turns zero-width non-joiners into spaces so that "می‌شود" and
 * "میشود" match.
 */
export function normalizePersianText(input: string): string {
  return toAsciiDigits(input)
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[ۀة]/g, 'ه')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ؤ/g, 'و')
    .replace(/[\u064b-\u065f\u0670\u0640]/g, '')
    .replace(/\u200c/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Groups the integer part with the Persian thousands separator (٬). */
export function groupAsciiInteger(value: number): string {
  const abs = Math.abs(Math.trunc(value));
  return String(abs).replace(/\B(?=(\d{3})+(?!\d))/g, '٬');
}
