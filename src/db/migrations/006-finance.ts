import type { SQLiteDatabase } from 'expo-sqlite';

const SQL = `
CREATE TABLE IF NOT EXISTS expense_categories (
  id TEXT PRIMARY KEY NOT NULL,
  factory_id TEXT NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('business', 'personal')),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  UNIQUE (factory_id, scope, name)
);

CREATE INDEX IF NOT EXISTS idx_expense_categories_scope
  ON expense_categories (factory_id, scope, is_active);

CREATE TABLE IF NOT EXISTS business_expenses (
  id TEXT PRIMARY KEY NOT NULL,
  factory_id TEXT NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES expense_categories(id) ON DELETE RESTRICT,
  expense_date TEXT NOT NULL,
  amount_afn INTEGER NOT NULL CHECK (amount_afn > 0),
  description TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_business_expenses_factory_date
  ON business_expenses (factory_id, expense_date DESC);

CREATE TABLE IF NOT EXISTS personal_transactions (
  id TEXT PRIMARY KEY NOT NULL,
  factory_id TEXT NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
  category_id TEXT REFERENCES expense_categories(id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense')),
  transaction_date TEXT NOT NULL,
  amount_afn INTEGER NOT NULL CHECK (amount_afn > 0),
  description TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_personal_transactions_factory_date
  ON personal_transactions (factory_id, transaction_date DESC);
`;

export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(SQL);
}
