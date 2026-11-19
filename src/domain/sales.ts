export function calculateSaleLineMinor(
  quantityGrams: number,
  unitPriceMinor: number
): number {
  if (!Number.isInteger(quantityGrams) || quantityGrams <= 0 ||
      !Number.isInteger(unitPriceMinor) || unitPriceMinor < 0) {
    throw new RangeError('Invalid sale quantity or unit price.');
  }
  return Math.round((quantityGrams / 1000) * unitPriceMinor);
}

export function calculateSalePaymentStatus(
  totalAfn: number,
  paidAfn: number
): 'unpaid' | 'partial' | 'paid' {
  if (!Number.isInteger(totalAfn) || totalAfn < 0 ||
      !Number.isInteger(paidAfn) || paidAfn < 0) {
    throw new RangeError('Invalid sale totals.');
  }
  if (paidAfn === 0) return 'unpaid';
  if (paidAfn >= totalAfn) return 'paid';
  return 'partial';
}
