import * as SQLite from 'expo-sqlite';

import { LATEST_SCHEMA_VERSION, migrations } from './migrations';

export const DATABASE_NAME = 'factory.db';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Opens the local operational database and applies any pending migrations.
 * The promise is memoized; a failed open is cleared so the UI can retry.
 */
export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = openAndMigrate().catch((error: unknown) => {
      databasePromise = null;
      throw error;
    });
  }

  return databasePromise;
}

async function openAndMigrate(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);

  await db.execAsync('PRAGMA journal_mode = WAL');
  await db.execAsync('PRAGMA foreign_keys = ON');

  await migrate(db);

  return db;
}

export async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;

  if (version > LATEST_SCHEMA_VERSION) {
    throw new Error(
      `Local database schema ${version} is newer than the app schema ${LATEST_SCHEMA_VERSION}.`
    );
  }

  for (const migration of migrations) {
    if (migration.version <= version) {
      continue;
    }

    await db.withTransactionAsync(async () => {
      await migration.up(db);
      await db.execAsync(`PRAGMA user_version = ${migration.version}`);
    });

    version = migration.version;
  }
}
