import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import { afnEquivalent } from '@/domain/money';
import {
  calculateCostPerKgAfn,
  calculateExpectedOutputGrams,
  calculateProductionMetrics,
} from '@/domain/production';
import { toUtcIso } from '@/lib/time';

import { recordAuditEvent } from './audit';
import { enqueueOutbox } from './outbox';
import type { ProductionBatch, ProductionInput } from '../types';

export interface ProductionInputDraft {
  rawMaterialId: string;
  quantityGrams: number;
}

export interface PostProductionInput {
  factoryId: string;
  productionDate: string;
  actualOutputGrams: number;
  inputs: ProductionInputDraft[];
  notes?: string;
  now?: string;
}

interface ProductionBatchRow {
  id: string;
  factory_id: string;
  production_date: string;
  finished_product_id: string;
  actual_output_grams: number;
  expected_output_grams: number;
  total_input_grams: number;
  actual_loss_grams: number;
  expected_loss_grams: number;
  additional_loss_grams: number;
  batch_cost_afn: number;
  cost_per_kg_afn: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface ProductionInputRow {
  id: string;
  raw_material_id: string;
  raw_material_name: string;
  quantity_grams: number;
  yield_milli_snapshot: number;
  expected_output_grams: number;
}

export async function ensureFinishedProduct(
  db: SQLiteDatabase,
  factoryId: string,
  now: string
): Promise<string> {
  const existing = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM finished_products
      WHERE factory_id = ? AND deleted_at IS NULL
      ORDER BY created_at ASC LIMIT 1`,
    factoryId
  );
  if (existing) return existing.id;

  const id = randomUUID();
  await db.runAsync(
    `INSERT INTO finished_products
       (id, factory_id, name, description, unit, minimum_stock_grams,
        is_active, created_at, updated_at)
     VALUES (?, ?, 'محصول نهایی', NULL, 'KG', 0, 1, ?, ?)`,
    id,
    factoryId,
    now,
    now
  );
  await recordAuditEvent(db, {
    factoryId,
    eventType: 'finished_product.created',
    entityType: 'finished_product',
    entityId: id,
  }, now);
  await enqueueOutbox(db, {
    factoryId,
    entityType: 'finished_product',
    entityId: id,
  }, now);
  return id;
}

export async function getFinishedProductBalance(
  db: SQLiteDatabase,
  factoryId: string
): Promise<number> {
  const row = await db.getFirstAsync<{ balance: number }>(
    `SELECT COALESCE(SUM(quantity_grams), 0) AS balance
       FROM stock_movements
      WHERE factory_id = ? AND stock_type = 'finished_product'`,
    factoryId
  );
  return row?.balance ?? 0;
}

async function calculateWeightedMaterialCostAfn(
  db: SQLiteDatabase,
  factoryId: string,
  rawMaterialId: string,
  consumedGrams: number
): Promise<number> {
  const rows = await db.getAllAsync<{
    quantity_grams: number;
    line_total_minor: number;
    currency: 'AFN' | 'USD';
    exchange_rate_milli: number | null;
  }>(
    `SELECT pi.quantity_grams, pi.line_total_minor,
            p.currency, p.exchange_rate_milli
       FROM purchase_items pi
       JOIN purchases p ON p.id = pi.purchase_id
      WHERE pi.factory_id = ? AND pi.raw_material_id = ?`,
    factoryId,
    rawMaterialId
  );

  let totalPurchasedGrams = 0;
  let totalCostAfn = 0;
  for (const row of rows) {
    totalPurchasedGrams += row.quantity_grams;
    totalCostAfn += row.currency === 'USD'
      ? afnEquivalent('USD', row.line_total_minor, row.exchange_rate_milli ?? 1000)
      : row.line_total_minor;
  }
  if (totalPurchasedGrams === 0) return 0;

  const averageCostPerGram = totalCostAfn / totalPurchasedGrams;
  return Math.round(averageCostPerGram * consumedGrams);
}

export async function postProduction(
  db: SQLiteDatabase,
  input: PostProductionInput
): Promise<ProductionBatch> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.productionDate)) {
    throw new Error('تاریخ تولید معتبر نیست.');
  }
  if (!Number.isInteger(input.actualOutputGrams) || input.actualOutputGrams < 0) {
    throw new Error('محصول واقعی معتبر نیست.');
  }
  if (input.inputs.length === 0) throw new Error('حداقل یک ماده اولیه را انتخاب کنید.');

  const now = input.now ?? toUtcIso();
  let batchId = '';

  await db.withTransactionAsync(async () => {
    const finishedProductId = await ensureFinishedProduct(db, input.factoryId, now);
    let totalInputGrams = 0;
    let expectedOutputGrams = 0;
    let batchCostAfn = 0;

    for (const draft of input.inputs) {
      if (!Number.isInteger(draft.quantityGrams) || draft.quantityGrams <= 0) {
        throw new Error('مقدار ماده اولیه معتبر نیست.');
      }
      const material = await db.getFirstAsync<{
        id: string;
        expected_yield_milli: number;
      }>(
        `SELECT id, expected_yield_milli
           FROM raw_materials
          WHERE id = ? AND factory_id = ? AND is_active = 1`,
        draft.rawMaterialId,
        input.factoryId
      );
      if (!material) throw new Error('ماده اولیه معتبر انتخاب نشده است.');

      const balanceRow = await db.getFirstAsync<{ balance: number }>(
        `SELECT COALESCE(SUM(quantity_grams), 0) AS balance
           FROM stock_movements
          WHERE factory_id = ? AND stock_type = 'raw_material' AND stock_item_id = ?`,
        input.factoryId,
        draft.rawMaterialId
      );
      const balance = balanceRow?.balance ?? 0;
      if (draft.quantityGrams > balance) {
        throw new Error('مقدار مصرف‌شده از موجودی ماده بیشتر است.');
      }

      const itemExpectedOutput = calculateExpectedOutputGrams(
        draft.quantityGrams,
        material.expected_yield_milli
      );
      expectedOutputGrams += itemExpectedOutput;
      totalInputGrams += draft.quantityGrams;
      batchCostAfn += await calculateWeightedMaterialCostAfn(
        db,
        input.factoryId,
        draft.rawMaterialId,
        draft.quantityGrams
      );
    }

    const metrics = calculateProductionMetrics(
      totalInputGrams,
      expectedOutputGrams,
      input.actualOutputGrams
    );
    const costPerKgAfn = calculateCostPerKgAfn(
      batchCostAfn,
      input.actualOutputGrams
    );

    batchId = randomUUID();
    await db.runAsync(
      `INSERT INTO production_batches
         (id, factory_id, production_date, finished_product_id,
          actual_output_grams, expected_output_grams, total_input_grams,
          actual_loss_grams, expected_loss_grams, additional_loss_grams,
          batch_cost_afn, cost_per_kg_afn, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      batchId,
      input.factoryId,
      input.productionDate,
      finishedProductId,
      input.actualOutputGrams,
      expectedOutputGrams,
      totalInputGrams,
      metrics.actualLossGrams,
      metrics.expectedLossGrams,
      metrics.additionalLossGrams,
      batchCostAfn,
      costPerKgAfn,
      input.notes?.trim() || null,
      now,
      now
    );

    for (const draft of input.inputs) {
      const material = await db.getFirstAsync<{
        expected_yield_milli: number;
      }>(
        `SELECT expected_yield_milli FROM raw_materials
          WHERE id = ? AND factory_id = ?`,
        draft.rawMaterialId,
        input.factoryId
      );
      if (!material) throw new Error('ماده اولیه پیدا نشد.');

      const itemExpectedOutput = calculateExpectedOutputGrams(
        draft.quantityGrams,
        material.expected_yield_milli
      );
      await db.runAsync(
        `INSERT INTO production_inputs
           (id, factory_id, production_batch_id, raw_material_id,
            quantity_grams, yield_milli_snapshot, expected_output_grams, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        randomUUID(),
        input.factoryId,
        batchId,
        draft.rawMaterialId,
        draft.quantityGrams,
        material.expected_yield_milli,
        itemExpectedOutput,
        now
      );

      const rawBalance = await db.getFirstAsync<{ balance: number }>(
        `SELECT COALESCE(SUM(quantity_grams), 0) AS balance
           FROM stock_movements
          WHERE factory_id = ? AND stock_type = 'raw_material' AND stock_item_id = ?`,
        input.factoryId,
        draft.rawMaterialId
      );
      const rawResult = (rawBalance?.balance ?? 0) - draft.quantityGrams;
      const rawMovementId = randomUUID();
      await db.runAsync(
        `INSERT INTO stock_movements
           (id, factory_id, stock_type, stock_item_id, quantity_grams,
            resulting_balance_grams, movement_type, source_type, source_id, memo, occurred_at, created_at)
         VALUES (?, ?, 'raw_material', ?, ?, ?, 'production', 'production', ?, ?, ?, ?)`,
        rawMovementId,
        input.factoryId,
        draft.rawMaterialId,
        -draft.quantityGrams,
        rawResult,
        batchId,
        input.notes?.trim() || null,
        now,
        now
      );
      await enqueueOutbox(db, {
        factoryId: input.factoryId,
        entityType: 'stock_movement',
        entityId: rawMovementId,
      }, now);
    }

    const finishedBalance = await db.getFirstAsync<{ balance: number }>(
      `SELECT COALESCE(SUM(quantity_grams), 0) AS balance
         FROM stock_movements
        WHERE factory_id = ? AND stock_type = 'finished_product'`,
      input.factoryId
    );
    const finishedResult = (finishedBalance?.balance ?? 0) + input.actualOutputGrams;
    const finishedMovementId = randomUUID();
    await db.runAsync(
      `INSERT INTO stock_movements
         (id, factory_id, stock_type, stock_item_id, quantity_grams,
          resulting_balance_grams, movement_type, source_type, source_id, memo, occurred_at, created_at)
       VALUES (?, ?, 'finished_product', ?, ?, ?, 'production', 'production', ?, ?, ?, ?)`,
      finishedMovementId,
      input.factoryId,
      finishedProductId,
      input.actualOutputGrams,
      finishedResult,
      batchId,
      input.notes?.trim() || null,
      now,
      now
    );
    await enqueueOutbox(db, {
      factoryId: input.factoryId,
      entityType: 'stock_movement',
      entityId: finishedMovementId,
    }, now);

    await recordAuditEvent(db, {
      factoryId: input.factoryId,
      eventType: 'production.posted',
      entityType: 'production_batch',
      entityId: batchId,
      details: {
        totalInputGrams,
        actualOutputGrams: input.actualOutputGrams,
        expectedOutputGrams,
        batchCostAfn,
      },
    }, now);
    await enqueueOutbox(db, {
      factoryId: input.factoryId,
      entityType: 'production_batch',
      entityId: batchId,
    }, now);
  });

  const batch = await getProductionBatch(db, input.factoryId, batchId);
  if (!batch) throw new Error('ثبت تولید ناموفق بود.');
  return batch;
}

export async function getProductionBatch(
  db: SQLiteDatabase,
  factoryId: string,
  batchId: string
): Promise<ProductionBatch | null> {
  const rows = await getProductionBatches(db, factoryId, 1000);
  return rows.find((row) => row.id === batchId) ?? null;
}

export async function getProductionBatches(
  db: SQLiteDatabase,
  factoryId: string,
  limit = 50
): Promise<ProductionBatch[]> {
  const batchRows = await db.getAllAsync<ProductionBatchRow>(
    `SELECT *
       FROM production_batches
      WHERE factory_id = ? AND deleted_at IS NULL
      ORDER BY production_date DESC, created_at DESC
      LIMIT ?`,
    factoryId,
    limit
  );

  const batches: ProductionBatch[] = [];
  for (const row of batchRows) {
    const inputRows = await db.getAllAsync<ProductionInputRow>(
      `SELECT pi.*, rm.name AS raw_material_name
         FROM production_inputs pi
         JOIN raw_materials rm ON rm.id = pi.raw_material_id
        WHERE pi.factory_id = ? AND pi.production_batch_id = ?
        ORDER BY pi.created_at ASC`,
      factoryId,
      row.id
    );
    const inputs: ProductionInput[] = inputRows.map((input) => ({
      id: input.id,
      rawMaterialId: input.raw_material_id,
      rawMaterialName: input.raw_material_name,
      quantityGrams: input.quantity_grams,
      yieldMilliSnapshot: input.yield_milli_snapshot,
      expectedOutputGrams: input.expected_output_grams,
    }));
    batches.push({
      id: row.id,
      productionDate: row.production_date,
      finishedProductId: row.finished_product_id,
      actualOutputGrams: row.actual_output_grams,
      expectedOutputGrams: row.expected_output_grams,
      totalInputGrams: row.total_input_grams,
      actualLossGrams: row.actual_loss_grams,
      expectedLossGrams: row.expected_loss_grams,
      additionalLossGrams: row.additional_loss_grams,
      batchCostAfn: row.batch_cost_afn,
      costPerKgAfn: row.cost_per_kg_afn,
      notes: row.notes,
      inputs,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
  return batches;
}
