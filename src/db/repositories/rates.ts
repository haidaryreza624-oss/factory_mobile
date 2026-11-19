import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import { toUtcIso } from '@/lib/time';

import { recordAuditEvent } from './audit';
import { enqueueOutbox } from './outbox';
import { mapExchangeRate, type ExchangeRate, type ExchangeRateRow } from '../types';

export interface SaveDailyRateInput {
  factoryId: string;
  /** Milli-AFN per USD. */
  rateMilli: number;
  /** Kabul calendar date, `YYYY-MM-DD`. */
  effectiveDate: string;
  now?: string;
}

export interface SaveDailyRateResult {
  rate: ExchangeRate;
  previousRateMilli: number | null;
  created: boolean;
}

export async function getLatestRate(
  db: SQLiteDatabase,
  factoryId: string
): Promise<ExchangeRate | null> {
  const row = await db.getFirstAsync<ExchangeRateRow>(
    `SELECT *
       FROM exchange_rates
      WHERE factory_id = ?
      ORDER BY effective_date DESC
      LIMIT 1`,
    factoryId
  );

  return row ? mapExchangeRate(row) : null;
}

export async function getRateForDate(
  db: SQLiteDatabase,
  factoryId: string,
  effectiveDate: string
): Promise<ExchangeRate | null> {
  const row = await db.getFirstAsync<ExchangeRateRow>(
    `SELECT *
       FROM exchange_rates
      WHERE factory_id = ? AND effective_date = ?
      LIMIT 1`,
    factoryId,
    effectiveDate
  );

  return row ? mapExchangeRate(row) : null;
}

export async function getRateHistory(
  db: SQLiteDatabase,
  factoryId: string,
  limit = 30
): Promise<ExchangeRate[]> {
  const rows = await db.getAllAsync<ExchangeRateRow>(
    `SELECT *
       FROM exchange_rates
      WHERE factory_id = ?
      ORDER BY effective_date DESC
      LIMIT ?`,
    factoryId,
    limit
  );

  return rows.map(mapExchangeRate);
}

/**
 * Creates or replaces the rate for one calendar day. Editing today's rate is
 * an auditable update; historical transactions keep their own rate snapshot.
 */
export async function saveDailyRate(
  db: SQLiteDatabase,
  input: SaveDailyRateInput
): Promise<SaveDailyRateResult> {
  if (!Number.isInteger(input.rateMilli) || input.rateMilli <= 0) {
    throw new Error('Rate must be a positive integer in milli-AFN.');
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.effectiveDate)) {
    throw new Error('effectiveDate must be YYYY-MM-DD.');
  }

  const now = input.now ?? toUtcIso();
  let rateId = '';
  let previousRateMilli: number | null = null;
  let created = false;

  await db.withTransactionAsync(async () => {
    const existing = await db.getFirstAsync<ExchangeRateRow>(
      `SELECT *
         FROM exchange_rates
        WHERE factory_id = ? AND effective_date = ?
        LIMIT 1`,
      input.factoryId,
      input.effectiveDate
    );

    if (existing) {
      rateId = existing.id;
      previousRateMilli = existing.rate_milli;
      created = false;

      await db.runAsync(
        `UPDATE exchange_rates
            SET rate_milli = ?, entered_at = ?, updated_at = ?
          WHERE id = ?`,
        input.rateMilli,
        now,
        now,
        existing.id
      );
    } else {
      rateId = randomUUID();
      created = true;

      await db.runAsync(
        `INSERT INTO exchange_rates
           (id, factory_id, rate_milli, effective_date, entered_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        rateId,
        input.factoryId,
        input.rateMilli,
        input.effectiveDate,
        now,
        now,
        now
      );
    }

    await recordAuditEvent(
      db,
      {
        factoryId: input.factoryId,
        eventType: created ? 'exchange_rate.created' : 'exchange_rate.updated',
        entityType: 'exchange_rate',
        entityId: rateId,
        details: {
          effectiveDate: input.effectiveDate,
          previousRateMilli,
          rateMilli: input.rateMilli,
        },
      },
      now
    );

    await enqueueOutbox(
      db,
      {
        factoryId: input.factoryId,
        entityType: 'exchange_rate',
        entityId: rateId,
      },
      now
    );
  });

  return {
    rate: {
      id: rateId,
      rateMilli: input.rateMilli,
      effectiveDate: input.effectiveDate,
      enteredAt: now,
      updatedAt: now,
    },
    previousRateMilli,
    created,
  };
}
