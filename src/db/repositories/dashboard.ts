import type { SQLiteDatabase } from 'expo-sqlite';

import { getKabulDateISO } from '@/lib/time';

import { countPendingOutbox } from './outbox';
import { getLatestRate, getRateForDate } from './rates';
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

  const balances = await db.getAllAsync<{ currency: string; balance: number }>(
    `SELECT currency, COALESCE(SUM(amount_minor), 0) AS balance
       FROM cash_movements
      WHERE factory_id = ?
      GROUP BY currency`,
    factoryId
  );

  const todayDate = getKabulDateISO(now);
  const [latestRate, todayRate, pendingSyncCount] = await Promise.all([
    getLatestRate(db, factoryId),
    getRateForDate(db, factoryId, todayDate),
    countPendingOutbox(db, factoryId),
  ]);

  return {
    factory: mapFactory(factoryRow),
    afnBalance: balances.find((row) => row.currency === 'AFN')?.balance ?? 0,
    usdBalance: balances.find((row) => row.currency === 'USD')?.balance ?? 0,
    latestRate,
    todayRate,
    todayDate,
    pendingSyncCount,
  };
}
