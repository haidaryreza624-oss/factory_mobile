import type { SQLiteDatabase } from 'expo-sqlite';

const SQL = `
CREATE TABLE IF NOT EXISTS customers (
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

CREATE INDEX IF NOT EXISTS idx_customers_factory_active
  ON customers (factory_id, is_active);

CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY NOT NULL,
  factory_id TEXT NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  sale_date TEXT NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_sales_factory_date
  ON sales (factory_id, sale_date DESC);

CREATE INDEX IF NOT EXISTS idx_sales_customer
  ON sales (customer_id);

CREATE TABLE IF NOT EXISTS sale_items (
  id TEXT PRIMARY KEY NOT NULL,
  factory_id TEXT NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
  sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  finished_product_id TEXT NOT NULL REFERENCES finished_products(id) ON DELETE RESTRICT,
  quantity_grams INTEGER NOT NULL CHECK (quantity_grams > 0),
  unit_price_minor INTEGER NOT NULL CHECK (unit_price_minor >= 0),
  line_total_minor INTEGER NOT NULL CHECK (line_total_minor >= 0),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale
  ON sale_items (sale_id);

CREATE TABLE IF NOT EXISTS customer_payments (
  id TEXT PRIMARY KEY NOT NULL,
  factory_id TEXT NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  sale_id TEXT REFERENCES sales(id) ON DELETE SET NULL,
  payment_currency TEXT NOT NULL CHECK (payment_currency IN ('AFN', 'USD')),
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
  afn_equivalent INTEGER NOT NULL CHECK (afn_equivalent >= 0),
  exchange_rate_milli INTEGER CHECK (exchange_rate_milli > 0),
  paid_at TEXT NOT NULL,
  memo TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_customer_payments_customer
  ON customer_payments (customer_id);
`;

export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(SQL);
}
