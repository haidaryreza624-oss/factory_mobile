import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import {
  getCloudRevision,
  restoreCloudSnapshot as restoreLocalCloudSnapshot,
  saveCloudSyncResult,
  captureCloudSnapshot,
} from '@/db/repositories/cloud-backup';
import { validateCloudSnapshot } from '@/domain/cloud-snapshot';
import {
  isRecoveryStorageAvailable,
  registerCloudBackup,
  restoreCloudBackup,
  storeRecoveryCode,
  syncCloudBackup,
} from '@/lib/cloud-client';
import type { CloudBackupResult } from '@/lib/cloud-client';

let activeSync: Promise<CloudBackupResult> | null = null;

export function createRecoveryCode(): string {
  const rawCode = randomUUID().replace(/-/g, '').toUpperCase();
  return rawCode.match(/.{1,4}/g)?.join('-') ?? rawCode;
}

export async function registerLocalCloudBackup(
  db: SQLiteDatabase,
  factoryId: string,
  recoveryCode: string
) {
  const initialCapture = await captureCloudSnapshot(db, factoryId);
  const registration = await registerCloudBackup(
    factoryId,
    recoveryCode,
    initialCapture.snapshot
  );
  const currentCapture = await captureCloudSnapshot(db, factoryId);
  const result = await syncCloudBackup(
    factoryId,
    recoveryCode,
    registration.revision,
    currentCapture.snapshot
  );
  await saveCloudSyncResult(
    db,
    factoryId,
    result.revision,
    result.updatedAt,
    currentCapture.pendingOutboxIds
  );
  return result;
}

export async function syncLocalCloudBackup(
  db: SQLiteDatabase,
  factoryId: string,
  recoveryCode: string
): Promise<CloudBackupResult> {
  if (activeSync) return activeSync;
  activeSync = performLocalCloudSync(db, factoryId, recoveryCode);
  try {
    return await activeSync;
  } finally {
    activeSync = null;
  }
}

async function performLocalCloudSync(
  db: SQLiteDatabase,
  factoryId: string,
  recoveryCode: string
): Promise<CloudBackupResult> {
  const currentCapture = await captureCloudSnapshot(db, factoryId);
  const baseRevision = await getCloudRevision(db, factoryId);
  if (baseRevision < 1) throw new Error('backup_not_registered');

  const result = await syncCloudBackup(
    factoryId,
    recoveryCode,
    baseRevision,
    currentCapture.snapshot
  );
  await saveCloudSyncResult(
    db,
    factoryId,
    result.revision,
    result.updatedAt,
    currentCapture.pendingOutboxIds
  );
  return result;
}

export async function restoreLocalCloudBackup(
  db: SQLiteDatabase,
  recoveryCode: string
): Promise<void> {
  const result = await restoreCloudBackup(recoveryCode);
  const snapshot = validateCloudSnapshot(result.snapshot, result.factoryId);
  if (isRecoveryStorageAvailable()) {
    await storeRecoveryCode(recoveryCode);
  }
  await restoreLocalCloudSnapshot(db, snapshot, result.revision, result.updatedAt);
}
