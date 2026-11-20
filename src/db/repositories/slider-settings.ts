import type { SQLiteDatabase } from 'expo-sqlite';

import type { Currency } from '@/domain/money';
import { toUtcIso } from '@/lib/time';

export interface PriceSliderRange {
  min: number;
  max: number;
  step: number;
}

export interface SliderSettings {
  purchasePriceAfn: PriceSliderRange;
  purchasePriceUsd: PriceSliderRange;
  salePriceAfn: PriceSliderRange;
  salePriceUsd: PriceSliderRange;
  productionOutputStepGrams: number;
}

export const DEFAULT_SLIDER_SETTINGS: SliderSettings = {
  purchasePriceAfn: { min: 0, max: 10_000, step: 10 },
  purchasePriceUsd: { min: 0, max: 10_000, step: 10 },
  salePriceAfn: { min: 0, max: 10_000, step: 10 },
  salePriceUsd: { min: 0, max: 10_000, step: 10 },
  productionOutputStepGrams: 100,
};

const SETTING_KEYS = {
  purchasePriceAfn: {
    min: 'slider.purchase.price_afn_min',
    max: 'slider.purchase.price_afn_max',
    step: 'slider.purchase.price_afn_step',
  },
  purchasePriceUsd: {
    min: 'slider.purchase.price_usd_min_cents',
    max: 'slider.purchase.price_usd_max_cents',
    step: 'slider.purchase.price_usd_step_cents',
  },
  salePriceAfn: {
    min: 'slider.sale.price_afn_min',
    max: 'slider.sale.price_afn_max',
    step: 'slider.sale.price_afn_step',
  },
  salePriceUsd: {
    min: 'slider.sale.price_usd_min_cents',
    max: 'slider.sale.price_usd_max_cents',
    step: 'slider.sale.price_usd_step_cents',
  },
  productionOutputStepGrams: 'slider.production.output_step_grams',
} as const;

function readInteger(value: string | undefined, fallback: number, allowZero = false): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= (allowZero ? 0 : 1)
    ? parsed
    : fallback;
}

function readRange(
  values: Map<string, string>,
  keys: { min: string; max: string; step: string },
  fallback: PriceSliderRange
): PriceSliderRange {
  const min = readInteger(values.get(keys.min), fallback.min, true);
  const max = readInteger(values.get(keys.max), fallback.max);
  const step = readInteger(values.get(keys.step), fallback.step);

  return max > min ? { min, max, step } : fallback;
}

function rangeEntries(
  keys: { min: string; max: string; step: string },
  range: PriceSliderRange
): [string, string][] {
  return [
    [keys.min, String(range.min)],
    [keys.max, String(range.max)],
    [keys.step, String(range.step)],
  ];
}

function validateSettings(settings: SliderSettings): void {
  const ranges = [
    settings.purchasePriceAfn,
    settings.purchasePriceUsd,
    settings.salePriceAfn,
    settings.salePriceUsd,
  ];
  const positiveValues = ranges.map(({ step }) => step);
  const validPositiveValues = positiveValues.every(
    (value) => Number.isSafeInteger(value) && value > 0
  );
  const validRanges = ranges.every(
    ({ min, max }) => Number.isSafeInteger(min) && min >= 0 &&
      Number.isSafeInteger(max) && max > min
  );
  const validProductionOutputStep =
    Number.isSafeInteger(settings.productionOutputStepGrams) &&
    settings.productionOutputStepGrams > 0;

  if (!validPositiveValues || !validRanges || !validProductionOutputStep) {
    throw new RangeError('Slider settings must use positive steps and valid price ranges.');
  }
}

export async function getSliderSettings(
  db: SQLiteDatabase,
  factoryId: string
): Promise<SliderSettings> {
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    `SELECT key, value FROM app_settings
      WHERE factory_id = ? AND key LIKE 'slider.%'`,
    factoryId
  );
  const values = new Map(rows.map((row) => [row.key, row.value]));
  const defaults = DEFAULT_SLIDER_SETTINGS;

  return {
    purchasePriceAfn: readRange(
      values,
      SETTING_KEYS.purchasePriceAfn,
      defaults.purchasePriceAfn
    ),
    purchasePriceUsd: readRange(
      values,
      SETTING_KEYS.purchasePriceUsd,
      defaults.purchasePriceUsd
    ),
    salePriceAfn: readRange(
      values,
      SETTING_KEYS.salePriceAfn,
      defaults.salePriceAfn
    ),
    salePriceUsd: readRange(
      values,
      SETTING_KEYS.salePriceUsd,
      defaults.salePriceUsd
    ),
    productionOutputStepGrams: readInteger(
      values.get(SETTING_KEYS.productionOutputStepGrams),
      defaults.productionOutputStepGrams
    ),
  };
}

export async function saveSliderSettings(
  db: SQLiteDatabase,
  factoryId: string,
  settings: SliderSettings,
  now = toUtcIso()
): Promise<void> {
  validateSettings(settings);

  const entries: [string, string][] = [
    ...rangeEntries(SETTING_KEYS.purchasePriceAfn, settings.purchasePriceAfn),
    ...rangeEntries(SETTING_KEYS.purchasePriceUsd, settings.purchasePriceUsd),
    ...rangeEntries(SETTING_KEYS.salePriceAfn, settings.salePriceAfn),
    ...rangeEntries(SETTING_KEYS.salePriceUsd, settings.salePriceUsd),
    [SETTING_KEYS.productionOutputStepGrams, String(settings.productionOutputStepGrams)],
  ];

  await db.withTransactionAsync(async () => {
    for (const [key, value] of entries) {
      await db.runAsync(
        `INSERT INTO app_settings (factory_id, key, value, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(factory_id, key) DO UPDATE SET
           value = excluded.value,
           updated_at = excluded.updated_at`,
        factoryId,
        key,
        value,
        now
      );
    }
  });
}

export function getUnitPriceSliderRange(
  settings: SliderSettings,
  transaction: 'purchase' | 'sale',
  currency: Currency
): PriceSliderRange {
  if (transaction === 'purchase') {
    return currency === 'AFN' ? settings.purchasePriceAfn : settings.purchasePriceUsd;
  }

  return currency === 'AFN' ? settings.salePriceAfn : settings.salePriceUsd;
}
