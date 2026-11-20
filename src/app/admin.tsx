import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { AppTextInput } from '@/components/ui/app-text-input';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Spacing } from '@/constants/theme';
import { resetLocalApplicationData } from '@/db/repositories/admin';
import {
  CloudBackupError,
  authorizeAdminReset,
  clearStoredRecoveryCode,
  resetCloudBackupData,
} from '@/lib/cloud-client';
import { fa } from '@/i18n';
import { useApp } from '@/providers/app-provider';
import { useDatabase } from '@/providers/database-provider';

type ResetOperation = 'local' | 'cloud';

export default function AdminScreen() {
  const db = useDatabase();
  const { refresh } = useApp();
  const [pendingOperation, setPendingOperation] = useState<ResetOperation | null>(null);
  const [password, setPassword] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [localResetComplete, setLocalResetComplete] = useState(false);
  const [cloudResetComplete, setCloudResetComplete] = useState(false);

  if (!__DEV__) return <Redirect href="/(tabs)/more" />;

  const selectOperation = (operation: ResetOperation) => {
    setPendingOperation(operation);
    setPassword('');
    setError(null);
    setNotice(null);
  };

  const continueToSetup = async () => {
    try {
      await refresh();
      router.replace('/setup');
    } catch (cause) {
      console.error('Unable to continue after clearing local data.', cause);
      setError(fa.admin.errors.localReset);
    }
  };

  const executeReset = async () => {
    if (!pendingOperation || !password || working) return;

    const operation = pendingOperation;
    setWorking(true);
    setError(null);
    setNotice(null);
    try {
      if (operation === 'local') {
        await authorizeAdminReset(password);
        await resetLocalApplicationData(db);
        setLocalResetComplete(true);
        await clearStoredRecoveryCode();
        setNotice(fa.admin.localDone);
      } else {
        await resetCloudBackupData(password);
        setCloudResetComplete(true);
        setNotice(fa.admin.cloudDone);
      }

      setPendingOperation(null);
      setPassword('');
      const localIsEmpty = localResetComplete || operation === 'local';
      const cloudIsEmpty = cloudResetComplete || operation === 'cloud';
      if (localIsEmpty && cloudIsEmpty) await continueToSetup();
    } catch (cause) {
      console.error(`Admin ${operation} reset failed.`, cause);
      setPassword('');
      setError(getResetError(cause, operation));
    } finally {
      setWorking(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader
        title={fa.admin.title}
        subtitle={fa.admin.subtitle}
        onBack={() => router.back()}
      />
      <Card tone="danger">
        <ThemedText type="small" themeColor="danger">
          {fa.admin.warning}
        </ThemedText>
      </Card>

      <Card>
        <ThemedText type="subtitle">{fa.admin.localTitle}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {fa.admin.localBody}
        </ThemedText>
        <AppButton
          label={fa.admin.clearLocal}
          variant="danger"
          disabled={working}
          onPress={() => selectOperation('local')}
        />
        {pendingOperation === 'local' ? (
          <ResetConfirmation
            body={fa.admin.localConfirmBody}
            password={password}
            onPasswordChange={setPassword}
            confirmLabel={fa.admin.confirmLocal}
            cancelLabel={fa.admin.cancel}
            working={working}
            onConfirm={() => void executeReset()}
            onCancel={() => {
              setPendingOperation(null);
              setPassword('');
              setError(null);
            }}
          />
        ) : null}
        {localResetComplete && !cloudResetComplete ? (
          <AppButton
            label={fa.admin.continueToSetup}
            variant="secondary"
            disabled={working}
            onPress={() => void continueToSetup()}
          />
        ) : null}
      </Card>

      <Card>
        <ThemedText type="subtitle">{fa.admin.cloudTitle}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {fa.admin.cloudBody}
        </ThemedText>
        <AppButton
          label={fa.admin.clearCloud}
          variant="danger"
          disabled={working}
          onPress={() => selectOperation('cloud')}
        />
        {pendingOperation === 'cloud' ? (
          <ResetConfirmation
            body={fa.admin.cloudConfirmBody}
            password={password}
            onPasswordChange={setPassword}
            confirmLabel={fa.admin.confirmCloud}
            cancelLabel={fa.admin.cancel}
            working={working}
            onConfirm={() => void executeReset()}
            onCancel={() => {
              setPendingOperation(null);
              setPassword('');
              setError(null);
            }}
          />
        ) : null}
      </Card>

      {error ? (
        <Card tone="danger">
          <ThemedText type="small" themeColor="danger">{error}</ThemedText>
        </Card>
      ) : null}
      {notice ? (
        <Card tone="success">
          <ThemedText type="small" themeColor="success">{notice}</ThemedText>
        </Card>
      ) : null}
    </Screen>
  );
}

interface ResetConfirmationProps {
  body: string;
  password: string;
  onPasswordChange: (value: string) => void;
  confirmLabel: string;
  cancelLabel: string;
  working: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ResetConfirmation({
  body,
  password,
  onPasswordChange,
  confirmLabel,
  cancelLabel,
  working,
  onConfirm,
  onCancel,
}: ResetConfirmationProps) {
  return (
    <View style={styles.confirmation}>
      <ThemedText type="caption" themeColor="textSecondary">{body}</ThemedText>
      <AppTextInput
        label={fa.admin.passwordLabel}
        value={password}
        onChangeText={onPasswordChange}
        writingDirection="ltr"
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        editable={!working}
        returnKeyType="done"
        onSubmitEditing={onConfirm}
      />
      <AppButton
        label={confirmLabel}
        variant="danger"
        loading={working}
        disabled={!password}
        onPress={onConfirm}
      />
      <AppButton
        label={cancelLabel}
        variant="ghost"
        disabled={working}
        onPress={onCancel}
      />
    </View>
  );
}

function getResetError(cause: unknown, operation: ResetOperation): string {
  if (cause instanceof CloudBackupError) {
    switch (cause.code) {
      case 'invalid_admin_password': return fa.admin.errors.invalidPassword;
      case 'admin_reset_not_configured': return fa.admin.errors.passwordNotConfigured;
      case 'too_many_attempts': return fa.admin.errors.tooManyAttempts;
      case 'network_error':
      case 'cloud_not_configured': return fa.admin.errors.network;
      case 'request_timeout': return fa.admin.errors.timeout;
      case 'server_not_configured':
      case 'admin_reset_failed': return fa.admin.errors.cloudReset;
      default: return fa.admin.errors.unknown;
    }
  }
  return operation === 'local'
    ? fa.admin.errors.localReset
    : fa.admin.errors.cloudReset;
}

const styles = StyleSheet.create({
  confirmation: {
    gap: Spacing.two,
  },
});
