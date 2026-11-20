import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { AppTextInput } from '@/components/ui/app-text-input';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import {
  countPendingOutbox,
} from '@/db/repositories/outbox';
import {
  getCloudLastSyncedAt,
  getCloudRevision,
  getCloudSyncError,
  saveCloudSyncFailure,
} from '@/db/repositories/cloud-backup';
import {
  CloudBackupError,
  formatRecoveryCode,
  getStoredRecoveryCode,
  isCloudConfigured,
  isRecoveryStorageAvailable,
  normalizeRecoveryCode,
  storeRecoveryCode,
} from '@/lib/cloud-client';
import {
  createRecoveryCode,
  registerLocalCloudBackup,
  restoreLocalCloudBackup,
  syncLocalCloudBackup,
} from '@/lib/cloud-backup';
import { fa } from '@/i18n';
import { toPersianDigits } from '@/lib/persian';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/providers/app-provider';
import { useDatabase } from '@/providers/database-provider';

export default function CloudBackupScreen() {
  const db = useDatabase();
  const { factory, refresh } = useApp();
  const theme = useTheme();
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [restoreCode, setRestoreCode] = useState('');
  const [revision, setRevision] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      getStoredRecoveryCode(),
      factory ? getCloudRevision(db, factory.id) : Promise.resolve(0),
      factory ? getCloudLastSyncedAt(db, factory.id) : Promise.resolve(null),
      factory ? getCloudSyncError(db, factory.id) : Promise.resolve(null),
      factory ? countPendingOutbox(db, factory.id) : Promise.resolve(0),
    ])
      .then(([storedCode, savedRevision, savedSyncAt, savedError, savedPendingCount]) => {
        if (!active) return;
        setRecoveryCode(storedCode);
        setRevision(savedRevision);
        setLastSyncedAt(savedSyncAt);
        setSyncError(savedError);
        setPendingCount(savedPendingCount);
      })
      .catch((cause: unknown) => {
        if (active) setError(getErrorMessage(cause));
      });

    return () => {
      active = false;
    };
  }, [db, factory]);

  const handleBackup = async () => {
    if (!factory || busy) return;
    setError(null);
    setBusy(true);
    let code = recoveryCode;

    try {
      if (!code) {
        code = createRecoveryCode();
        await storeRecoveryCode(code);
        setRecoveryCode(code);
      }

      const result =
        revision > 0
          ? await syncLocalCloudBackup(db, factory.id, code)
          : await registerLocalCloudBackup(db, factory.id, code);
      setRevision(result.revision);
      setLastSyncedAt(result.updatedAt);
      setSyncError(null);
      setPendingCount(await countPendingOutbox(db, factory.id));
    } catch (cause) {
      setError(getErrorMessage(cause));
      const errorCode =
        cause instanceof CloudBackupError
          ? cause.code
          : 'manual_sync_failed';
      try {
        await saveCloudSyncFailure(db, factory.id, errorCode);
        setSyncError(errorCode);
      } catch (saveError) {
        console.error('Unable to save the manual cloud sync failure.', saveError);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async () => {
    if (busy) return;
    if (factory) {
      setError(fa.cloudBackup.errors.localFactoryExists);
      return;
    }

    const normalized = normalizeRecoveryCode(restoreCode);
    if (!/^[0-9A-F]{32}$/.test(normalized)) {
      setError(fa.cloudBackup.errors.invalidRecoveryCode);
      return;
    }

    setError(null);
    setBusy(true);
    try {
      await restoreLocalCloudBackup(db, normalized);
      await refresh();
      router.replace('/(tabs)');
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const configured = isCloudConfigured();
  const secureStorageAvailable = isRecoveryStorageAvailable();

  return (
    <Screen>
      <ScreenHeader
        title={fa.cloudBackup.title}
        subtitle={fa.cloudBackup.subtitle}
        onBack={() => router.back()}
      />

      {!configured ? (
        <Card tone="warning">
          <ThemedText type="small">{fa.cloudBackup.cloudNotConfigured}</ThemedText>
        </Card>
      ) : null}

      {factory ? (
        <>
          <Card>
            <ThemedText type="subtitle">{fa.cloudBackup.setupTitle}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {fa.cloudBackup.setupBody}
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {fa.cloudBackup.automaticSync}
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {fa.cloudBackup.localOnly}
            </ThemedText>
          </Card>

          {recoveryCode ? (
            <Card tone="info">
              <ThemedText type="smallBold">{fa.cloudBackup.codeLabel}</ThemedText>
              <ThemedText selectable type="code" style={[styles.recoveryCode, { color: theme.text }]}>
                {formatRecoveryCode(recoveryCode)}
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {fa.cloudBackup.codeHint}
              </ThemedText>
            </Card>
          ) : null}

          <Card>
            <ThemedText type="smallBold">{fa.cloudBackup.lastBackup}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {lastSyncedAt
                ? new Date(lastSyncedAt).toLocaleString('fa-AF')
                : fa.cloudBackup.neverBackedUp}
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {pendingCount > 0
                ? fa.cloudBackup.pendingCount(toPersianDigits(String(pendingCount)))
                : fa.cloudBackup.noPending}
            </ThemedText>
          </Card>

          {!secureStorageAvailable ? (
            <Card tone="warning">
              <ThemedText type="small">{fa.cloudBackup.secureStorageUnavailable}</ThemedText>
            </Card>
          ) : null}

          <AppButton
            label={revision > 0 ? fa.cloudBackup.syncNow : fa.cloudBackup.enable}
            loading={busy}
            disabled={!configured || !secureStorageAvailable}
            onPress={handleBackup}
          />
          {syncError ? (
            <Card tone="warning">
              <ThemedText type="small">{getErrorMessage(new CloudBackupError(syncError))}</ThemedText>
            </Card>
          ) : null}
        </>
      ) : (
        <>
          <Card>
            <ThemedText type="subtitle">{fa.cloudBackup.restoreTitle}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {fa.cloudBackup.restoreBody}
            </ThemedText>
          </Card>

          <AppTextInput
            label={fa.cloudBackup.restoreCode}
            value={restoreCode}
            onChangeText={setRestoreCode}
            autoCapitalize="characters"
            autoCorrect={false}
            keyboardType="visible-password"
            maxLength={39}
            editable={!busy}
            writingDirection="ltr"
          />
          <AppButton
            label={fa.cloudBackup.restore}
            loading={busy}
            disabled={!configured}
            onPress={handleRestore}
          />
        </>
      )}

      {error ? (
        <Card tone="danger">
          <ThemedText type="small" style={{ color: theme.danger }}>
            {error}
          </ThemedText>
        </Card>
      ) : null}

    </Screen>
  );
}

function getErrorMessage(cause: unknown): string {
  const code =
    cause instanceof CloudBackupError
      ? cause.code
      : cause instanceof Error && cause.message
        ? cause.message
        : 'unknown';

  const errorMessages: Record<string, string> = {
    invalid_recovery_code: fa.cloudBackup.errors.invalidRecoveryCode,
    recovery_code_not_found: fa.cloudBackup.errors.recoveryCodeNotFound,
    too_many_attempts: fa.cloudBackup.errors.tooManyAttempts,
    revision_conflict: fa.cloudBackup.errors.revisionConflict,
    backup_not_registered: fa.cloudBackup.errors.backupNotRegistered,
    factory_already_registered: fa.cloudBackup.errors.factoryAlreadyRegistered,
    snapshot_too_large: fa.cloudBackup.errors.snapshotTooLarge,
    cloud_not_configured: fa.cloudBackup.errors.cloudNotConfigured,
    secure_storage_unavailable: fa.cloudBackup.errors.secureStorageUnavailable,
    network_error: fa.cloudBackup.errors.networkError,
    local_factory_exists: fa.cloudBackup.errors.localFactoryExists,
    invalid_snapshot: fa.cloudBackup.errors.invalidSnapshot,
    request_timeout: fa.cloudBackup.errors.networkError,
  };
  return errorMessages[code] ?? fa.cloudBackup.errors.unknown;
}

const styles = StyleSheet.create({
  recoveryCode: {
    paddingVertical: 8,
    textAlign: 'center',
    fontSize: 20,
  },
});
