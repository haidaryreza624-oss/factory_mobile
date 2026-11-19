import type { SQLiteDatabase } from 'expo-sqlite';

const SQL = `
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY NOT NULL,
  factory_id TEXT NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  notes TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_suppliers_factory_active
  ON suppliers (factory_id, is_active);

CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY NOT NULL,
  factory_id TEXT NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
  supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  purchase_date TEXT NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('AFN', 'USD')),
  total_original_minor INTEGER NOT NULL CHECK (total_original_minor >= 0),
  total_afn INTEGER NOT NULL CHECK (total_afn >= 0),
  exchange_rate_milli INTEGER CHECK (exchange_rate_milli > 0),
  paid_afn INTEGER NOT NULL DEFAULT 0 CHECK (paid_afn >= 0),
  outstanding_afn INTEGER NOT NULL CHECK (outstanding_afn >= 0),
  payment_status TEXT NOT NULL CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  reference TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_purchases_factory_date
  ON purchases (factory_id, purchase_date DESC);

CREATE INDEX IF NOT EXISTS idx_purchases_supplier
  ON purchases (supplier_id);

CREATE TABLE IF NOT EXISTS purchase_items (
  id TEXT PRIMARY KEY NOT NULL,
  factory_id TEXT NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
  purchase_id TEXT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  raw_material_id TEXT NOT NULL REFERENCES raw_materials(id) ON DELETE RESTRICT,
  quantity_grams INTEGER NOT NULL CHECK (quantity_grams > 0),
  unit_price_minor INTEGER NOT NULL CHECK (unit_price_minor >= 0),
  line_total_minor INTEGER NOT NULL CHECK (line_total_minor >= 0),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase
  ON purchase_items (purchase_id);

CREATE TABLE IF NOT EXISTS purchase_payments (
  id TEXT PRIMARY KEY NOT NULL,
  factory_id TEXT NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
  purchase_id TEXT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  payment_currency TEXT NOT NULL CHECK (payment_currency IN ('AFN', 'USD')),
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
  afn_equivalent INTEGER NOT NULL CHECK (afn_equivalent >= 0),
  exchange_rate_milli INTEGER CHECK (exchange_rate_milli > 0),
  paid_at TEXT NOT NULL,
  memo TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_purchase_payments_purchase
  ON purchase_payments (purchase_id);
`;

export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(SQL);
}
