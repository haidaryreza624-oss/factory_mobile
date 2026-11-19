import type { SQLiteDatabase } from 'expo-sqlite';

import { up as upInitial } from './001-initial';
import { up as upInventory } from './002-inventory';
import { up as upPurchases } from './003-purchases';
import { up as upProduction } from './004-production';
import { up as upSales } from './005-sales';
import { up as upFinance } from './006-finance';

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
  {
    version: 4,
    name: 'production',
    up: upProduction,
  },
  {
    version: 5,
    name: 'sales',
    up: upSales,
  },
  {
    version: 6,
    name: 'finance',
    up: upFinance,
  },
];

export const LATEST_SCHEMA_VERSION = migrations[migrations.length - 1].version;
