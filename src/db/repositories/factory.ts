import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import { fa } from '@/i18n';
import { toUtcIso, KABUL_TIME_ZONE } from '@/lib/time';

import { recordAuditEvent } from './audit';
import { enqueueOutbox } from './outbox';
import { mapFactory, type Factory, type FactoryRow } from '../types';

export interface CreateFactoryInput {
  factoryName: string;
  ownerName: string | null;
  /** Whole AFN. */
  openingAfn: number;
  now?: string;
}

export interface CreateFactoryResult {
  factoryId: string;
  afnAccountId: string;
}

export async function getFactory(db: SQLiteDatabase): Promise<Factory | null> {
  const row = await db.getFirstAsync<FactoryRow>(
    `SELECT *
       FROM factories
      WHERE deleted_at IS NULL
      ORDER BY created_at ASC
      LIMIT 1`
  );

  return row ? mapFactory(row) : null;
}

/**
 * Creates the local factory, its AFN cash account, opening balance, an
 * audit record, and the first outbox entries — all in one transaction.
 */
export async function createFactoryWithSetup(
  db: SQLiteDatabase,
  input: CreateFactoryInput
): Promise<CreateFactoryResult> {
  const name = input.factoryName.trim();
  if (name.length < 2) {
    throw new Error('Factory name is too short.');
  }

  if (!Number.isInteger(input.openingAfn) || input.openingAfn < 0) {
    throw new Error('Opening cash must be a non-negative integer.');
  }

  const now = input.now ?? toUtcIso();
  const factoryId = randomUUID();
  const afnAccountId = randomUUID();
  const ownerName = input.ownerName?.trim() || null;

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO factories
         (id, name, owner_name, reporting_currency, timezone, locale, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      factoryId,
      name,
      ownerName,
      'AFN',
      KABUL_TIME_ZONE,
      'fa',
      now,
      now
    );

    await db.runAsync(
      `INSERT INTO cash_accounts
         (id, factory_id, currency, name, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, ?, ?)`,
      afnAccountId,
      factoryId,
      'AFN',
      `نقدی ${fa.units.afn}`,
      now,
      now
    );

    await db.runAsync(
      `INSERT INTO app_settings (factory_id, key, value, updated_at)
       VALUES (?, ?, ?, ?)`,
      factoryId,
      'rounding_policy',
      'truncate',
      now
    );

    if (input.openingAfn > 0) {
      const movementId = randomUUID();

      await db.runAsync(
        `INSERT INTO cash_movements
           (id, factory_id, account_id, currency, amount_minor, source_type, source_id, occurred_at, memo, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
        movementId,
        factoryId,
        afnAccountId,
        'AFN',
        input.openingAfn,
        'opening',
        now,
        'موجودی اولیه',
        now
      );

      await enqueueOutbox(
        db,
        {
          factoryId,
          entityType: 'cash_movement',
          entityId: movementId,
        },
        now
      );
    }

    await enqueueOutbox(
      db,
      { factoryId, entityType: 'factory', entityId: factoryId },
      now
    );
    await enqueueOutbox(
      db,
      { factoryId, entityType: 'cash_account', entityId: afnAccountId },
      now
    );
    await recordAuditEvent(
      db,
      {
        factoryId,
        eventType: 'factory.created',
        entityType: 'factory',
        entityId: factoryId,
        details: {
          name,
          ownerName,
          openingAfn: input.openingAfn,
        },
      },
      now
    );
  });

  return { factoryId, afnAccountId };
}
