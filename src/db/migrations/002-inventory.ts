import type { SQLiteDatabase } from 'expo-sqlite';

const SQL = `
CREATE TABLE IF NOT EXISTS raw_materials (
  id TEXT PRIMARY KEY NOT NULL,
  factory_id TEXT NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT NOT NULL DEFAULT 'KG',
  minimum_stock_grams INTEGER NOT NULL DEFAULT 0 CHECK (minimum_stock_grams >= 0),
  expected_yield_milli INTEGER NOT NULL DEFAULT 1000 CHECK (expected_yield_milli > 0),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_raw_materials_factory_active
  ON raw_materials (factory_id, is_active);

CREATE TABLE IF NOT EXISTS finished_products (
  id TEXT PRIMARY KEY NOT NULL,
  factory_id TEXT NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT NOT NULL DEFAULT 'KG',
  minimum_stock_grams INTEGER NOT NULL DEFAULT 0 CHECK (minimum_stock_grams >= 0),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY NOT NULL,
  factory_id TEXT NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
  stock_type TEXT NOT NULL CHECK (stock_type IN ('raw_material', 'finished_product')),
  stock_item_id TEXT NOT NULL,
  quantity_grams INTEGER NOT NULL CHECK (quantity_grams <> 0),
  resulting_balance_grams INTEGER NOT NULL CHECK (resulting_balance_grams >= 0),
  movement_type TEXT NOT NULL,
  source_type TEXT,
  source_id TEXT,
  memo TEXT,
  occurred_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_item_time
  ON stock_movements (stock_item_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_movements_factory_time
  ON stock_movements (factory_id, occurred_at DESC);
`;

export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(SQL);
}
