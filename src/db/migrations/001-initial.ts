import type { SQLiteDatabase } from 'expo-sqlite';

const SQL = `
CREATE TABLE IF NOT EXISTS factories (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  owner_name TEXT,
  reporting_currency TEXT NOT NULL DEFAULT 'AFN' CHECK (reporting_currency IN ('AFN', 'USD')),
  timezone TEXT NOT NULL DEFAULT 'Asia/Kabul',
  locale TEXT NOT NULL DEFAULT 'fa',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS app_settings (
  factory_id TEXT NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (factory_id, key)
);

CREATE TABLE IF NOT EXISTS cash_accounts (
  id TEXT PRIMARY KEY NOT NULL,
  factory_id TEXT NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
  currency TEXT NOT NULL CHECK (currency IN ('AFN', 'USD')),
  name TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (factory_id, currency)
);

CREATE INDEX IF NOT EXISTS idx_cash_accounts_factory
  ON cash_accounts (factory_id);

CREATE TABLE IF NOT EXISTS exchange_rates (
  id TEXT PRIMARY KEY NOT NULL,
  factory_id TEXT NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
  rate_milli INTEGER NOT NULL CHECK (rate_milli > 0),
  effective_date TEXT NOT NULL,
  entered_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (factory_id, effective_date)
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_factory_date
  ON exchange_rates (factory_id, effective_date DESC);

CREATE TABLE IF NOT EXISTS cash_movements (
  id TEXT PRIMARY KEY NOT NULL,
  factory_id TEXT NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES cash_accounts(id) ON DELETE RESTRICT,
  currency TEXT NOT NULL CHECK (currency IN ('AFN', 'USD')),
  amount_minor INTEGER NOT NULL CHECK (amount_minor <> 0),
  source_type TEXT NOT NULL,
  source_id TEXT,
  occurred_at TEXT NOT NULL,
  memo TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cash_movements_account
  ON cash_movements (account_id);

CREATE INDEX IF NOT EXISTS idx_cash_movements_factory_time
  ON cash_movements (factory_id, occurred_at);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY NOT NULL,
  factory_id TEXT NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_events_factory_time
  ON audit_events (factory_id, created_at DESC);

CREATE TABLE IF NOT EXISTS sync_outbox (
  id TEXT PRIMARY KEY NOT NULL,
  factory_id TEXT NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('upsert', 'delete')),
  payload TEXT,
  created_at TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TEXT,
  last_error TEXT,
  synced_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_outbox_pending
  ON sync_outbox (factory_id, synced_at, created_at);
`;

export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(SQL);
}
