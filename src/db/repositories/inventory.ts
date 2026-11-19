import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import { toUtcIso } from '@/lib/time';

import { recordAuditEvent } from './audit';
import { enqueueOutbox } from './outbox';
import type {
  RawMaterial,
  RawMaterialRow,
  StockMovement,
  StockMovementRow,
} from '../types';

export interface SaveRawMaterialInput {
  factoryId: string;
  id?: string;
  name: string;
  description?: string;
  minimumStockGrams: number;
  expectedYieldMilli: number;
  initialStockGrams?: number;
  now?: string;
}

function mapRawMaterial(row: RawMaterialRow, currentStockGrams = 0): RawMaterial {
  return {
    id: row.id,
    factoryId: row.factory_id,
    name: row.name,
    description: row.description,
    unit: 'KG',
    minimumStockGrams: row.minimum_stock_grams,
    expectedYieldMilli: row.expected_yield_milli,
    isActive: row.is_active === 1,
    currentStockGrams,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMovement(row: StockMovementRow): StockMovement {
  return {
    id: row.id,
    stockType: row.stock_type,
    stockItemId: row.stock_item_id,
    quantityGrams: row.quantity_grams,
    resultingBalanceGrams: row.resulting_balance_grams,
    movementType: row.movement_type,
    sourceType: row.source_type,
    sourceId: row.source_id,
    memo: row.memo,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
  };
}

export async function getRawMaterials(
  db: SQLiteDatabase,
  factoryId: string,
  includeInactive = false
): Promise<RawMaterial[]> {
  const rows = await db.getAllAsync<RawMaterialRow>(
    `SELECT *
       FROM raw_materials
      WHERE factory_id = ? AND deleted_at IS NULL
        ${includeInactive ? '' : 'AND is_active = 1'}
      ORDER BY name ASC`,
    factoryId
  );

  return Promise.all(
    rows.map(async (row) => {
      const balance = await db.getFirstAsync<{ balance: number }>(
        `SELECT COALESCE(SUM(quantity_grams), 0) AS balance
           FROM stock_movements
          WHERE factory_id = ? AND stock_type = 'raw_material' AND stock_item_id = ?`,
        factoryId,
        row.id
      );
      return mapRawMaterial(row, balance?.balance ?? 0);
    })
  );
}

export async function saveRawMaterial(
  db: SQLiteDatabase,
  input: SaveRawMaterialInput
): Promise<RawMaterial> {
  const name = input.name.trim();
  if (name.length < 2) {
    throw new Error('نام ماده باید حداقل دو حرف باشد.');
  }
  if (!Number.isInteger(input.minimumStockGrams) || input.minimumStockGrams < 0) {
    throw new Error('حداقل موجودی معتبر نیست.');
  }
  if (!Number.isInteger(input.expectedYieldMilli) || input.expectedYieldMilli <= 0) {
    throw new Error('توقع تولید معتبر نیست.');
  }
  if (input.initialStockGrams !== undefined &&
      (!Number.isInteger(input.initialStockGrams) || input.initialStockGrams < 0)) {
    throw new Error('موجودی اولیه معتبر نیست.');
  }

  const now = input.now ?? toUtcIso();
  let savedId = input.id;

  await db.withTransactionAsync(async () => {
    if (input.id) {
      await db.runAsync(
        `UPDATE raw_materials
            SET name = ?, description = ?, minimum_stock_grams = ?,
                expected_yield_milli = ?, updated_at = ?
          WHERE id = ? AND factory_id = ?`,
        name,
        input.description?.trim() || null,
        input.minimumStockGrams,
        input.expectedYieldMilli,
        now,
        input.id,
        input.factoryId
      );
      await recordAuditEvent(db, {
        factoryId: input.factoryId,
        eventType: 'raw_material.updated',
        entityType: 'raw_material',
        entityId: input.id,
        details: { name, minimumStockGrams: input.minimumStockGrams, expectedYieldMilli: input.expectedYieldMilli },
      }, now);
      await enqueueOutbox(db, {
        factoryId: input.factoryId,
        entityType: 'raw_material',
        entityId: input.id,
      }, now);
    } else {
      const materialId = randomUUID();
      savedId = materialId;
      await db.runAsync(
        `INSERT INTO raw_materials
           (id, factory_id, name, description, unit, minimum_stock_grams,
            expected_yield_milli, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'KG', ?, ?, 1, ?, ?)`,
        materialId,
        input.factoryId,
        name,
        input.description?.trim() || null,
        input.minimumStockGrams,
        input.expectedYieldMilli,
        now,
        now
      );

      if (input.initialStockGrams && input.initialStockGrams > 0) {
        await db.runAsync(
          `INSERT INTO stock_movements
             (id, factory_id, stock_type, stock_item_id, quantity_grams,
              resulting_balance_grams, movement_type, source_type, source_id, memo, occurred_at, created_at)
           VALUES (?, ?, 'raw_material', ?, ?, ?, 'opening', 'opening', NULL, 'موجودی اولیه', ?, ?)`,
          randomUUID(),
          input.factoryId,
          materialId,
          input.initialStockGrams,
          input.initialStockGrams,
          now,
          now
        );
      }

      await recordAuditEvent(db, {
        factoryId: input.factoryId,
        eventType: 'raw_material.created',
        entityType: 'raw_material',
        entityId: materialId,
        details: { name, minimumStockGrams: input.minimumStockGrams, expectedYieldMilli: input.expectedYieldMilli, initialStockGrams: input.initialStockGrams ?? 0 },
      }, now);
      await enqueueOutbox(db, {
        factoryId: input.factoryId,
        entityType: 'raw_material',
        entityId: materialId,
      }, now);
    }
  });

  const materials = await getRawMaterials(db, input.factoryId, true);
  const saved = materials.find((material) => material.id === savedId);
  if (saved) return saved;
  throw new Error('ذخیره ماده اولیه ناموفق بود.');
}

export async function setRawMaterialActive(
  db: SQLiteDatabase,
  factoryId: string,
  materialId: string,
  isActive: boolean,
  now = toUtcIso()
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE raw_materials
          SET is_active = ?, updated_at = ?
        WHERE id = ? AND factory_id = ?`,
      isActive ? 1 : 0,
      now,
      materialId,
      factoryId
    );
    await recordAuditEvent(db, {
      factoryId,
      eventType: isActive ? 'raw_material.activated' : 'raw_material.deactivated',
      entityType: 'raw_material',
      entityId: materialId,
    }, now);
    await enqueueOutbox(db, {
      factoryId,
      entityType: 'raw_material',
      entityId: materialId,
    }, now);
  });
}

export async function adjustRawMaterialStock(
  db: SQLiteDatabase,
  factoryId: string,
  materialId: string,
  quantityDeltaGrams: number,
  memo?: string,
  now = toUtcIso()
): Promise<StockMovement> {
  if (!Number.isInteger(quantityDeltaGrams) || quantityDeltaGrams === 0) {
    throw new Error('تعداد تعدیل معتبر نیست.');
  }

  let movement: StockMovement | null = null;

  await db.withTransactionAsync(async () => {
    const balanceRow = await db.getFirstAsync<{ balance: number }>(
      `SELECT COALESCE(SUM(quantity_grams), 0) AS balance
         FROM stock_movements
        WHERE factory_id = ? AND stock_type = 'raw_material' AND stock_item_id = ?`,
      factoryId,
      materialId
    );
    const balance = balanceRow?.balance ?? 0;
    const resulting = balance + quantityDeltaGrams;
    if (resulting < 0) {
      throw new Error('موجودی ماده نمی‌تواند منفی شود.');
    }

    const movementId = randomUUID();
    await db.runAsync(
      `INSERT INTO stock_movements
         (id, factory_id, stock_type, stock_item_id, quantity_grams,
          resulting_balance_grams, movement_type, source_type, source_id, memo, occurred_at, created_at)
       VALUES (?, ?, 'raw_material', ?, ?, ?, 'adjustment', 'adjustment', NULL, ?, ?, ?)`,
      movementId,
      factoryId,
      materialId,
      quantityDeltaGrams,
      resulting,
      memo?.trim() || null,
      now,
      now
    );
    await recordAuditEvent(db, {
      factoryId,
      eventType: 'raw_material.adjusted',
      entityType: 'raw_material',
      entityId: materialId,
      details: { quantityDeltaGrams, resultingBalanceGrams: resulting, memo: memo?.trim() || null },
    }, now);
    await enqueueOutbox(db, {
      factoryId,
      entityType: 'stock_movement',
      entityId: movementId,
    }, now);

    const row = await db.getFirstAsync<StockMovementRow>(
      'SELECT * FROM stock_movements WHERE id = ?',
      movementId
    );
    if (row) movement = mapMovement(row);
  });

  if (!movement) throw new Error('ثبت حرکت موجودی ناموفق بود.');
  return movement;
}

export async function getRawMaterialMovements(
  db: SQLiteDatabase,
  factoryId: string,
  materialId: string,
  limit = 30
): Promise<StockMovement[]> {
  const rows = await db.getAllAsync<StockMovementRow>(
    `SELECT *
       FROM stock_movements
      WHERE factory_id = ? AND stock_type = 'raw_material' AND stock_item_id = ?
      ORDER BY occurred_at DESC, created_at DESC
      LIMIT ?`,
    factoryId,
    materialId,
    limit
  );
  return rows.map(mapMovement);
}
