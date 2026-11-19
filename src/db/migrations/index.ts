import type { SQLiteDatabase } from 'expo-sqlite';

import { up as upInitial } from './001-initial';

export interface Migration {
  version: number;
  name: string;
  up: (db: SQLiteDatabase) => Promise<void>;
}

export const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial',
    up: upInitial,
  },
];

export const LATEST_SCHEMA_VERSION = migrations[migrations.length - 1].version;
