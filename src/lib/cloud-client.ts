import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import type { CloudSnapshot } from '@/domain/cloud-snapshot';

const RECOVERY_CODE_KEY = 'factory.recovery-code';

export interface CloudBackupResult {
  factoryId: string;
  revision: number;
  updatedAt: string;
}

export interface CloudRestoreResult extends CloudBackupResult {
  snapshot: unknown;
}

export class CloudBackupError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'CloudBackupError';
  }
}

export function isCloudConfigured(): boolean {
  return Boolean(
    process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  );
}

export function isRecoveryStorageAvailable(): boolean {
  return Platform.OS !== 'web';
}

export async function getStoredRecoveryCode(): Promise<string | null> {
  if (!isRecoveryStorageAvailable()) return null;
  return SecureStore.getItemAsync(RECOVERY_CODE_KEY);
}

export async function storeRecoveryCode(code: string): Promise<void> {
  if (!isRecoveryStorageAvailable()) {
    throw new CloudBackupError('secure_storage_unavailable');
  }
  await SecureStore.setItemAsync(RECOVERY_CODE_KEY, code);
}

export function normalizeRecoveryCode(value: string): string {
  return value.replace(/[\s-]/g, '').toUpperCase();
}

export function formatRecoveryCode(value: string): string {
  const normalized = normalizeRecoveryCode(value);
  return normalized.match(/.{1,4}/g)?.join('-') ?? normalized;
}

export async function registerCloudBackup(
  factoryId: string,
  recoveryCode: string,
  snapshot: CloudSnapshot
): Promise<CloudBackupResult> {
  return parseBackupResult(
    await requestCloud({
      action: 'register',
      factoryId,
      recoveryCode,
      snapshot,
    }),
    factoryId
  );
}

export async function syncCloudBackup(
  factoryId: string,
  recoveryCode: string,
  baseRevision: number,
  snapshot: CloudSnapshot
): Promise<CloudBackupResult> {
  return parseBackupResult(
    await requestCloud({
      action: 'sync',
      factoryId,
      recoveryCode,
      baseRevision,
      snapshot,
    }),
    factoryId
  );
}

export async function restoreCloudBackup(
  recoveryCode: string
): Promise<CloudRestoreResult> {
  const result = await requestCloud({
    action: 'restore',
    recoveryCode: normalizeRecoveryCode(recoveryCode),
  });
  if (
    !isRecord(result) ||
    typeof result.factoryId !== 'string' ||
    !isSafeInteger(result.revision) ||
    typeof result.updatedAt !== 'string' ||
    !('snapshot' in result)
  ) {
    throw new CloudBackupError('invalid_server_response');
  }
  return {
    factoryId: result.factoryId,
    revision: result.revision,
    updatedAt: result.updatedAt,
    snapshot: result.snapshot,
  };
}

export async function authorizeAdminReset(password: string): Promise<void> {
  const result = await requestCloud({
    action: 'authorize_reset',
    adminPassword: password,
  });
  if (!isRecord(result) || result.authorized !== true) {
    throw new CloudBackupError('invalid_server_response');
  }
}

export async function resetCloudBackupData(password: string): Promise<void> {
  const result = await requestCloud({
    action: 'reset',
    adminPassword: password,
  });
  if (!isRecord(result) || result.reset !== true) {
    throw new CloudBackupError('invalid_server_response');
  }
}

export async function clearStoredRecoveryCode(): Promise<void> {
  if (!isRecoveryStorageAvailable()) return;
  await SecureStore.deleteItemAsync(RECOVERY_CODE_KEY);
}

async function requestCloud(body: Record<string, unknown>): Promise<unknown> {
  const projectUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, '');
  const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!projectUrl || !publishableKey) throw new CloudBackupError('cloud_not_configured');

  let response: Response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    response = await fetch(`${projectUrl}/functions/v1/factory-cloud`, {
      method: 'POST',
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${publishableKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw new CloudBackupError(
      controller.signal.aborted ? 'request_timeout' : 'network_error'
    );
  } finally {
    clearTimeout(timeout);
  }

  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new CloudBackupError('invalid_server_response');
  }

  if (!response.ok) {
    const errorCode =
      typeof result === 'object' &&
      result !== null &&
      'error' in result &&
      typeof result.error === 'string'
        ? result.error
        : 'cloud_request_failed';
    throw new CloudBackupError(errorCode);
  }

  return result;
}

function parseBackupResult(
  value: unknown,
  expectedFactoryId: string
): CloudBackupResult {
  if (
    !isRecord(value) ||
    value.factoryId !== expectedFactoryId ||
    !isSafeInteger(value.revision) ||
    typeof value.updatedAt !== 'string'
  ) {
    throw new CloudBackupError('invalid_server_response');
  }
  return {
    factoryId: value.factoryId,
    revision: value.revision,
    updatedAt: value.updatedAt,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}
