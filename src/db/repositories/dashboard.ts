import type { SQLiteDatabase } from 'expo-sqlite';

import { getKabulDateISO } from '@/lib/time';

import { countPendingOutbox } from './outbox';
import { getRateForDate } from './rates';
import { mapFactory, type DashboardSnapshot, type FactoryRow } from '../types';

export async function getDashboardSnapshot(
  db: SQLiteDatabase,
  factoryId: string,
  now: Date = new Date()
): Promise<DashboardSnapshot | null> {
  const factoryRow = await db.getFirstAsync<FactoryRow>(
    `SELECT *
       FROM factories
      WHERE id = ? AND deleted_at IS NULL
      LIMIT 1`,
    factoryId
  );

  if (!factoryRow) {
    return null;
  }

  const todayDate = getKabulDateISO(now);
  const [todayRate, pendingSyncCount] = await Promise.all([
    getRateForDate(db, factoryId, todayDate),
    countPendingOutbox(db, factoryId),
  ]);

  return {
    factory: mapFactory(factoryRow),
    todayRate,
    todayDate,
    pendingSyncCount,
  };
}
