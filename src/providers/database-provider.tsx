import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import type { SQLiteDatabase } from 'expo-sqlite';

import { FatalErrorScreen } from '@/components/ui/fatal-error-screen';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { getDatabase } from '@/db/database';

interface DatabaseContextValue {
  db: SQLiteDatabase;
}

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

/**
 * Opens the SQLite database and applies migrations before rendering the app.
 * A failed open shows a retry screen instead of crashing the whole app.
 */
export function DatabaseProvider({ children }: PropsWithChildren) {
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setError(null);

    getDatabase()
      .then((database) => {
        if (!cancelled) {
          setDb(database);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (error) {
    return <FatalErrorScreen message={error} onRetry={() => setAttempt((value) => value + 1)} />;
  }

  if (!db) {
    return <LoadingScreen />;
  }

  return <DatabaseContext.Provider value={{ db }}>{children}</DatabaseContext.Provider>;
}

export function useDatabase(): SQLiteDatabase {
  const context = useContext(DatabaseContext);

  if (!context) {
    throw new Error('useDatabase must be used inside DatabaseProvider.');
  }

  return context.db;
}
