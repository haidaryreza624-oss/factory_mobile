import * as SplashScreen from 'expo-splash-screen';
import * as Network from 'expo-network';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';
import { AppState } from 'react-native';

import { FatalErrorScreen } from '@/components/ui/fatal-error-screen';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { getFactory } from '@/db/repositories/factory';
import { countDuePendingOutbox } from '@/db/repositories/outbox';
import {
  getCloudRevision,
  saveCloudSyncFailure,
} from '@/db/repositories/cloud-backup';
import type { Factory } from '@/db/types';
import { CloudBackupError, getStoredRecoveryCode, isCloudConfigured } from '@/lib/cloud-client';
import { syncLocalCloudBackup } from '@/lib/cloud-backup';
import { toUtcIso } from '@/lib/time';
import { useDatabase } from '@/providers/database-provider';

interface AppContextValue {
  factory: Factory | null;
  /** Re-reads persisted state after a write. */
  refresh: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

/**
 * Loads the current factory (if the app has been set up) and exposes a
 * refresh hook so screens can re-read data after local commits.
 */
export function AppProvider({ children }: PropsWithChildren) {
  const db = useDatabase();
  const [factory, setFactory] = useState<Factory | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const factoryId = factory?.id;

  const load = useCallback(async () => {
    const loaded = await getFactory(db);
    setFactory(loaded);
    setStatus('ready');
  }, [db]);

  useEffect(() => {
    let cancelled = false;

    // Loading provider state from the database is asynchronous; updates happen only after the promise settles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : String(cause));
          setStatus('error');
        }
      })
      .finally(() => {
        if (!cancelled) {
          // The splash stays up until the first database read is finished, so
          // the owner never sees an empty dashboard flash.
          SplashScreen.hideAsync().catch(() => {});
        }
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, load]);

  useEffect(() => {
    if (!factoryId || !isCloudConfigured()) return;

    let cancelled = false;
    let running = false;
    let foreground = AppState.currentState !== 'background';

    const synchronizeIfNeeded = async (networkState?: Network.NetworkState) => {
      if (cancelled || running || !foreground) return;
      running = true;
      try {
        const [recoveryCode, revision, pendingCount] = await Promise.all([
          getStoredRecoveryCode(),
          getCloudRevision(db, factoryId),
          countDuePendingOutbox(db, factoryId, toUtcIso()),
        ]);
        if (!recoveryCode || revision < 1 || pendingCount === 0) return;

        const state = networkState ?? (await Network.getNetworkStateAsync());
        if (state.isConnected !== true || state.isInternetReachable === false) return;

        await syncLocalCloudBackup(db, factoryId, recoveryCode);
      } catch (cause) {
        if (!cancelled) {
          const errorCode =
            cause instanceof CloudBackupError
              ? cause.code
              : 'automatic_sync_failed';
          try {
            await saveCloudSyncFailure(db, factoryId, errorCode);
          } catch (saveError) {
            console.error('Unable to save the automatic cloud sync failure.', saveError);
          }
        }
      } finally {
        running = false;
      }
    };

    const networkSubscription = Network.addNetworkStateListener((state) => {
      if (state.isConnected === true && state.isInternetReachable !== false) {
        void synchronizeIfNeeded(state);
      }
    });
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      foreground = state === 'active';
      if (foreground) void synchronizeIfNeeded();
    });
    const retryTimer = setInterval(() => {
      void synchronizeIfNeeded();
    }, 60_000);

    void synchronizeIfNeeded();

    return () => {
      cancelled = true;
      networkSubscription.remove();
      appStateSubscription.remove();
      clearInterval(retryTimer);
    };
  }, [db, factoryId]);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  if (status === 'error') {
    return (
      <FatalErrorScreen
        message={error ?? undefined}
        onRetry={() => {
          setError(null);
          setStatus('loading');
          setAttempt((value) => value + 1);
        }}
      />
    );
  }

  if (status === 'loading') {
    return <LoadingScreen />;
  }

  return <AppContext.Provider value={{ factory, refresh }}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error('useApp must be used inside AppProvider.');
  }

  return context;
}
