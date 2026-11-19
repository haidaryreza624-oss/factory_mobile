import * as SplashScreen from 'expo-splash-screen';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';

import { FatalErrorScreen } from '@/components/ui/fatal-error-screen';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { getFactory } from '@/db/repositories/factory';
import type { Factory } from '@/db/types';
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

  const load = useCallback(async () => {
    const loaded = await getFactory(db);
    setFactory(loaded);
    setStatus('ready');
  }, [db]);

  useEffect(() => {
    let cancelled = false;

    setStatus('loading');
    setError(null);

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

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  if (status === 'error') {
    return (
      <FatalErrorScreen
        message={error ?? undefined}
        onRetry={() => setAttempt((value) => value + 1)}
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
