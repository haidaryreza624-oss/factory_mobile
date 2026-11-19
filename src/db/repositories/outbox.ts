import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

export type OutboxOperation = 'upsert' | 'delete';

export interface OutboxEntryInput {
  factoryId: string;
  entityType: string;
  entityId: string;
  operation?: OutboxOperation;
  payload?: string | null;
}

export async function enqueueOutbox(
  db: SQLiteDatabase,
  input: OutboxEntryInput,
  now: string
): Promise<string> {
  const id = randomUUID();

  await db.runAsync(
    `INSERT INTO sync_outbox
       (id, factory_id, entity_type, entity_id, operation, payload, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.factoryId,
    input.entityType,
    input.entityId,
    input.operation ?? 'upsert',
    input.payload ?? null,
    now
  );

  return id;
}

export async function countPendingOutbox(
  db: SQLiteDatabase,
  factoryId: string
): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count
       FROM sync_outbox
      WHERE factory_id = ? AND synced_at IS NULL`,
    factoryId
  );

  return row?.count ?? 0;
}
