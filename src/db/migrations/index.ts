import type { SQLiteDatabase } from 'expo-sqlite';

import { up as upInitial } from './001-initial';
import { up as upInventory } from './002-inventory';
import { up as upPurchases } from './003-purchases';

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
  {
    version: 2,
    name: 'inventory',
    up: upInventory,
  },
  {
    version: 3,
    name: 'purchases',
    up: upPurchases,
  },
];

export const LATEST_SCHEMA_VERSION = migrations[migrations.length - 1].version;
