import { LATEST_SCHEMA_VERSION } from '@/db/migrations';

export const cloudSnapshotTables = [
  'factories',
  'app_settings',
  'cash_accounts',
  'exchange_rates',
  'cash_movements',
  'audit_events',
  'raw_materials',
  'finished_products',
  'stock_movements',
  'suppliers',
  'purchases',
  'purchase_items',
  'purchase_payments',
  'production_batches',
  'production_inputs',
  'customers',
  'sales',
  'sale_items',
  'customer_payments',
  'expense_categories',
  'business_expenses',
  'personal_transactions',
] as const;

export type CloudSnapshotTable = (typeof cloudSnapshotTables)[number];
export type CloudSnapshotRows = Partial<Record<CloudSnapshotTable, Record<string, unknown>[]>>;

export interface CloudSnapshot {
  schemaVersion: number;
  factoryId: string;
  capturedAt: string;
  tables: CloudSnapshotRows;
}

export function validateCloudSnapshot(
  value: unknown,
  expectedFactoryId?: string
): CloudSnapshot {
  if (!isCloudSnapshot(value, expectedFactoryId)) throw new Error('invalid_snapshot');
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCloudSnapshot(
  value: unknown,
  expectedFactoryId?: string
): value is CloudSnapshot {
  if (!isRecord(value) || !isRecord(value.tables)) return false;
  const tables = value.tables;
  if (
    value.schemaVersion !== LATEST_SCHEMA_VERSION ||
    typeof value.factoryId !== 'string' ||
    value.factoryId.length === 0 ||
    (expectedFactoryId !== undefined && value.factoryId !== expectedFactoryId) ||
    typeof value.capturedAt !== 'string'
  ) {
    return false;
  }

  const tableKeys = Object.keys(value.tables);
  if (
    tableKeys.length !== cloudSnapshotTables.length ||
    !cloudSnapshotTables.every((table) => Array.isArray(tables[table]))
  ) {
    return false;
  }

  for (const table of cloudSnapshotTables) {
    const rows = tables[table];
    if (!Array.isArray(rows) || !rows.every(isRecord)) return false;

    for (const row of rows) {
      if (table === 'factories') {
        if (row.id !== value.factoryId) return false;
      } else if (row.factory_id !== value.factoryId) {
        return false;
      }
    }
  }

  return Array.isArray(tables.factories) && tables.factories.length === 1;
}
