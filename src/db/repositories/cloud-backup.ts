import type { SQLiteBindValue, SQLiteDatabase } from 'expo-sqlite';

import {
  cloudSnapshotTables,
  validateCloudSnapshot,
  type CloudSnapshot,
  type CloudSnapshotTable,
} from '@/domain/cloud-snapshot';
import { toUtcIso } from '@/lib/time';

const insertOrder: CloudSnapshotTable[] = [
  'factories',
  'app_settings',
  'cash_accounts',
  'exchange_rates',
  'raw_materials',
  'finished_products',
  'suppliers',
  'customers',
  'expense_categories',
  'cash_movements',
  'stock_movements',
  'audit_events',
  'purchases',
  'purchase_items',
  'purchase_payments',
  'production_batches',
  'production_inputs',
  'sales',
  'sale_items',
  'customer_payments',
  'business_expenses',
  'personal_transactions',
];

const deleteOrder = [...insertOrder].reverse();

export interface CapturedCloudSnapshot {
  snapshot: CloudSnapshot;
  pendingOutboxIds: string[];
}

export async function captureCloudSnapshot(
  db: SQLiteDatabase,
  factoryId: string
): Promise<CapturedCloudSnapshot> {
  let captured: CapturedCloudSnapshot | undefined;
  await db.withTransactionAsync(async () => {
    captured = await readCloudSnapshot(db, factoryId);
  });
  if (!captured) throw new Error('snapshot_capture_failed');
  return captured;
}

async function readCloudSnapshot(
  db: SQLiteDatabase,
  factoryId: string
): Promise<CapturedCloudSnapshot> {
  const tables: CloudSnapshot['tables'] = {};
  for (const table of cloudSnapshotTables) {
    const filterColumn = table === 'factories' ? 'id' : 'factory_id';
    tables[table] = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM ${table} WHERE ${filterColumn} = ?`,
      factoryId
    );
  }

  const outbox = await db.getAllAsync<{ id: string }>(
    `SELECT id FROM sync_outbox
      WHERE factory_id = ? AND synced_at IS NULL`,
    factoryId
  );
  const schemaVersion = await getSchemaVersion(db);
  return {
    snapshot: validateCloudSnapshot(
      {
        schemaVersion,
        factoryId,
        capturedAt: toUtcIso(),
        tables,
      },
      factoryId
    ),
    pendingOutboxIds: outbox.map((entry) => entry.id),
  };
}

export async function getCloudLastSyncedAt(
  db: SQLiteDatabase,
  factoryId: string
): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM app_settings WHERE factory_id = ? AND key = 'cloud.last_synced_at'`,
    factoryId
  );
  return row?.value ?? null;
}

export async function getCloudSyncError(
  db: SQLiteDatabase,
  factoryId: string
): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM app_settings WHERE factory_id = ? AND key = 'cloud.last_error'`,
    factoryId
  );
  return row?.value ?? null;
}

export async function saveCloudSyncFailure(
  db: SQLiteDatabase,
  factoryId: string,
  errorCode: string
): Promise<void> {
  const now = toUtcIso();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO app_settings (factory_id, key, value, updated_at)
       VALUES (?, 'cloud.last_error', ?, ?)
       ON CONFLICT(factory_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      factoryId,
      errorCode.slice(0, 120),
      now
    );
    await db.runAsync(
      `UPDATE sync_outbox
          SET attempt_count = attempt_count + 1,
              last_attempt_at = ?,
              last_error = ?
        WHERE factory_id = ? AND synced_at IS NULL`,
      now,
      errorCode.slice(0, 120),
      factoryId
    );
  });
}

export async function getCloudRevision(
  db: SQLiteDatabase,
  factoryId: string
): Promise<number> {
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM app_settings WHERE factory_id = ? AND key = 'cloud.revision'`,
    factoryId
  );
  const revision = row ? Number(row.value) : 0;
  return Number.isSafeInteger(revision) && revision >= 0 ? revision : 0;
}

export async function saveCloudSyncResult(
  db: SQLiteDatabase,
  factoryId: string,
  revision: number,
  updatedAt: string,
  pendingOutboxIds: string[]
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO app_settings (factory_id, key, value, updated_at)
       VALUES (?, 'cloud.revision', ?, ?)
       ON CONFLICT(factory_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      factoryId,
      String(revision),
      updatedAt
    );
    await db.runAsync(
      `INSERT INTO app_settings (factory_id, key, value, updated_at)
       VALUES (?, 'cloud.last_synced_at', ?, ?)
       ON CONFLICT(factory_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      factoryId,
      updatedAt,
      updatedAt
    );
    await db.runAsync(
      `DELETE FROM app_settings WHERE factory_id = ? AND key = 'cloud.last_error'`,
      factoryId
    );

    for (const batch of splitIntoBatches(pendingOutboxIds, 500)) {
      if (batch.length === 0) continue;
      await db.runAsync(
        `UPDATE sync_outbox
            SET synced_at = ?, attempt_count = attempt_count + 1,
                last_attempt_at = ?, last_error = NULL
          WHERE id IN (${batch.map(() => '?').join(', ')}) AND synced_at IS NULL`,
        updatedAt,
        updatedAt,
        ...batch
      );
    }
  });
}

export async function restoreCloudSnapshot(
  db: SQLiteDatabase,
  untrustedSnapshot: unknown,
  revision: number,
  updatedAt: string
): Promise<string> {
  const snapshot = validateCloudSnapshot(untrustedSnapshot);
  if (!Number.isSafeInteger(revision) || revision < 1) {
    throw new Error('invalid_snapshot');
  }

  const existing = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM factories WHERE deleted_at IS NULL LIMIT 1`
  );
  if (existing) throw new Error('local_factory_exists');

  await db.withTransactionAsync(async () => {
    for (const table of deleteOrder) {
      const filterColumn = table === 'factories' ? 'id' : 'factory_id';
      await db.runAsync(
        `DELETE FROM ${table} WHERE ${filterColumn} = ?`,
        snapshot.factoryId
      );
    }
    await db.runAsync(
      `DELETE FROM sync_outbox WHERE factory_id = ?`,
      snapshot.factoryId
    );

    for (const table of insertOrder) {
      const rows = snapshot.tables[table];
      if (!rows) throw new Error('invalid_snapshot');
      await insertSnapshotRows(db, table, rows);
    }

    await saveCloudMetadata(db, snapshot.factoryId, revision, updatedAt);
  });

  return snapshot.factoryId;
}

async function insertSnapshotRows(
  db: SQLiteDatabase,
  table: CloudSnapshotTable,
  rows: Record<string, unknown>[]
): Promise<void> {
  if (rows.length === 0) return;
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  const allowedColumns = new Set(columns.map((column) => column.name));
  const keys = Object.keys(rows[0]);
  if (
    keys.length === 0 ||
    keys.some((key) => !allowedColumns.has(key))
  ) {
    throw new Error('invalid_snapshot');
  }

  const expectedKeys = new Set(keys);
  if (
    rows.some(
      (row) =>
        Object.keys(row).length !== keys.length ||
        Object.keys(row).some((key) => !expectedKeys.has(key)) ||
        keys.some((key) => !isSQLiteBindValue(row[key]))
    )
  ) {
    throw new Error('invalid_snapshot');
  }

  const rowPlaceholder = `(${keys.map(() => '?').join(', ')})`;
  const rowsPerBatch = Math.max(1, Math.floor(900 / keys.length));
  for (const batch of splitIntoBatches(rows, rowsPerBatch)) {
    const values = batch.flatMap((row) => keys.map((key) => toSQLiteBindValue(row[key])));
    const placeholders = batch.map(() => rowPlaceholder).join(', ');
    await db.runAsync(
      `INSERT INTO ${table} (${keys.join(', ')}) VALUES ${placeholders}`,
      ...values
    );
  }
}

async function saveCloudMetadata(
  db: SQLiteDatabase,
  factoryId: string,
  revision: number,
  updatedAt: string
): Promise<void> {
  await db.runAsync(
    `INSERT INTO app_settings (factory_id, key, value, updated_at)
     VALUES (?, 'cloud.revision', ?, ?)
     ON CONFLICT(factory_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    factoryId,
    String(revision),
    updatedAt
  );
  await db.runAsync(
    `INSERT INTO app_settings (factory_id, key, value, updated_at)
     VALUES (?, 'cloud.last_synced_at', ?, ?)
     ON CONFLICT(factory_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    factoryId,
    updatedAt,
    updatedAt
  );
  await db.runAsync(
    `DELETE FROM app_settings WHERE factory_id = ? AND key = 'cloud.last_error'`,
    factoryId
  );
}

async function getSchemaVersion(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

function isSQLiteBindValue(value: unknown): value is SQLiteBindValue {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

function toSQLiteBindValue(value: unknown): SQLiteBindValue {
  if (!isSQLiteBindValue(value)) throw new Error('invalid_snapshot');
  return value;
}

function splitIntoBatches<T>(values: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    batches.push(values.slice(index, index + size));
  }
  return batches;
}
