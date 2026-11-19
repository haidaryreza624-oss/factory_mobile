import type { SQLiteDatabase } from 'expo-sqlite';

import { toUtcIso } from '@/lib/time';

export interface NotificationSettings {
  rateEnabled: boolean;
  productionEnabled: boolean;
  lowStockEnabled: boolean;
}

export async function getNotificationSettings(
  db: SQLiteDatabase,
  factoryId: string
): Promise<NotificationSettings> {
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    `SELECT key, value FROM app_settings
      WHERE factory_id = ? AND key LIKE 'notification.%'`,
    factoryId
  );
  const values = new Map(rows.map((row) => [row.key, row.value]));
  return {
    rateEnabled: values.get('notification.rate') !== 'false',
    productionEnabled: values.get('notification.production') !== 'false',
    lowStockEnabled: values.get('notification.low_stock') !== 'false',
  };
}

export async function saveNotificationSettings(
  db: SQLiteDatabase,
  factoryId: string,
  settings: NotificationSettings,
  now = toUtcIso()
): Promise<void> {
  await db.withTransactionAsync(async () => {
    const entries: [string, boolean][] = [
      ['notification.rate', settings.rateEnabled],
      ['notification.production', settings.productionEnabled],
      ['notification.low_stock', settings.lowStockEnabled],
    ];
    for (const [key, value] of entries) {
      await db.runAsync(
        `INSERT INTO app_settings (factory_id, key, value, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(factory_id, key) DO UPDATE SET
           value = excluded.value,
           updated_at = excluded.updated_at`,
        factoryId,
        key,
        value ? 'true' : 'false',
        now
      );
    }
  });
}
