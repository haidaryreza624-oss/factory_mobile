import type { SQLiteDatabase } from 'expo-sqlite';

import { toUtcIso } from '@/lib/time';

export interface NotificationSettings {
  enabled: boolean;
  rateEnabled: boolean;
  productionEnabled: boolean;
  lowStockEnabled: boolean;
  rateTime: string;
  productionTime: string;
  lowStockTime: string;
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
    enabled: values.get('notification.enabled') !== 'false',
    rateEnabled: values.get('notification.rate') !== 'false',
    productionEnabled: values.get('notification.production') !== 'false',
    lowStockEnabled: values.get('notification.low_stock') !== 'false',
    rateTime: values.get('notification.rate_time') ?? '06:00',
    productionTime: values.get('notification.production_time') ?? '16:00',
    lowStockTime: values.get('notification.low_stock_time') ?? '08:00',
  };
}

export async function saveNotificationSettings(
  db: SQLiteDatabase,
  factoryId: string,
  settings: NotificationSettings,
  now = toUtcIso()
): Promise<void> {
  await db.withTransactionAsync(async () => {
    const entries: [string, string][] = [
      ['notification.enabled', String(settings.enabled)],
      ['notification.rate', String(settings.rateEnabled)],
      ['notification.production', String(settings.productionEnabled)],
      ['notification.low_stock', String(settings.lowStockEnabled)],
      ['notification.rate_time', settings.rateTime],
      ['notification.production_time', settings.productionTime],
      ['notification.low_stock_time', settings.lowStockTime],
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
        value,
        now
      );
    }
  });
}
