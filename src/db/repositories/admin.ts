import type { SQLiteDatabase } from 'expo-sqlite';

const tablesToClear = [
  'sync_outbox',
  'audit_events',
  'personal_transactions',
  'business_expenses',
  'customer_payments',
  'sale_items',
  'sales',
  'customers',
  'production_inputs',
  'production_batches',
  'purchase_payments',
  'purchase_items',
  'purchases',
  'suppliers',
  'stock_movements',
  'finished_products',
  'raw_materials',
  'cash_movements',
  'exchange_rates',
  'cash_accounts',
  'expense_categories',
  'app_settings',
  'factories',
] as const;

export async function resetLocalApplicationData(db: SQLiteDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const table of tablesToClear) {
      await db.runAsync(`DELETE FROM ${table}`);
    }
  });
}
