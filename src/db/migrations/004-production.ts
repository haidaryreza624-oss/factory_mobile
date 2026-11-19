import type { SQLiteDatabase } from 'expo-sqlite';

const SQL = `
CREATE TABLE IF NOT EXISTS production_batches (
  id TEXT PRIMARY KEY NOT NULL,
  factory_id TEXT NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
  production_date TEXT NOT NULL,
  finished_product_id TEXT NOT NULL REFERENCES finished_products(id) ON DELETE RESTRICT,
  actual_output_grams INTEGER NOT NULL CHECK (actual_output_grams >= 0),
  expected_output_grams INTEGER NOT NULL CHECK (expected_output_grams >= 0),
  total_input_grams INTEGER NOT NULL CHECK (total_input_grams >= 0),
  actual_loss_grams INTEGER NOT NULL,
  expected_loss_grams INTEGER NOT NULL,
  additional_loss_grams INTEGER NOT NULL,
  batch_cost_afn INTEGER NOT NULL DEFAULT 0 CHECK (batch_cost_afn >= 0),
  cost_per_kg_afn INTEGER NOT NULL DEFAULT 0 CHECK (cost_per_kg_afn >= 0),
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_production_batches_factory_date
  ON production_batches (factory_id, production_date DESC);

CREATE TABLE IF NOT EXISTS production_inputs (
  id TEXT PRIMARY KEY NOT NULL,
  factory_id TEXT NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
  production_batch_id TEXT NOT NULL REFERENCES production_batches(id) ON DELETE CASCADE,
  raw_material_id TEXT NOT NULL REFERENCES raw_materials(id) ON DELETE RESTRICT,
  quantity_grams INTEGER NOT NULL CHECK (quantity_grams > 0),
  yield_milli_snapshot INTEGER NOT NULL CHECK (yield_milli_snapshot > 0),
  expected_output_grams INTEGER NOT NULL CHECK (expected_output_grams >= 0),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_production_inputs_batch
  ON production_inputs (production_batch_id);
`;

export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(SQL);
}
