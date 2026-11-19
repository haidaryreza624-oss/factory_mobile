import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

export interface AuditEventInput {
  factoryId: string;
  eventType: string;
  entityType?: string | null;
  entityId?: string | null;
  details?: unknown;
}

export async function recordAuditEvent(
  db: SQLiteDatabase,
  input: AuditEventInput,
  now: string
): Promise<void> {
  await db.runAsync(
    `INSERT INTO audit_events
       (id, factory_id, event_type, entity_type, entity_id, details, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    randomUUID(),
    input.factoryId,
    input.eventType,
    input.entityType ?? null,
    input.entityId ?? null,
    input.details === undefined ? null : JSON.stringify(input.details),
    now
  );
}
