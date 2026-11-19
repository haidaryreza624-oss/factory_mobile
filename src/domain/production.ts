export function calculateExpectedOutputGrams(
  quantityGrams: number,
  yieldMilli: number
): number {
  if (!Number.isInteger(quantityGrams) || quantityGrams < 0 ||
      !Number.isInteger(yieldMilli) || yieldMilli <= 0) {
    throw new RangeError('Invalid production quantity or yield.');
  }
  return Math.round((quantityGrams * yieldMilli) / 1000);
}

export function calculateProductionMetrics(
  totalInputGrams: number,
  expectedOutputGrams: number,
  actualOutputGrams: number
) {
  if (!Number.isInteger(totalInputGrams) || totalInputGrams < 0 ||
      !Number.isInteger(expectedOutputGrams) || expectedOutputGrams < 0 ||
      !Number.isInteger(actualOutputGrams) || actualOutputGrams < 0) {
    throw new RangeError('Invalid production metrics.');
  }
  const expectedLossGrams = Math.max(0, totalInputGrams - expectedOutputGrams);
  const actualLossGrams = Math.max(0, totalInputGrams - actualOutputGrams);
  return {
    expectedLossGrams,
    actualLossGrams,
    additionalLossGrams: actualLossGrams - expectedLossGrams,
  };
}

export function calculateCostPerKgAfn(
  batchCostAfn: number,
  actualOutputGrams: number
): number {
  if (!Number.isInteger(batchCostAfn) || batchCostAfn < 0 ||
      !Number.isInteger(actualOutputGrams) || actualOutputGrams < 0) {
    throw new RangeError('Invalid production cost.');
  }
  if (actualOutputGrams === 0) return 0;
  return Math.round((batchCostAfn * 1000) / actualOutputGrams);
}
