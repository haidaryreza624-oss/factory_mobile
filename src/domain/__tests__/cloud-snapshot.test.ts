import { describe, expect, it } from 'vitest';

import { LATEST_SCHEMA_VERSION } from '@/db/migrations';
import { cloudSnapshotTables, validateCloudSnapshot } from '@/domain/cloud-snapshot';

function validSnapshot() {
  const tables: Record<string, Record<string, unknown>[]> = Object.fromEntries(
    cloudSnapshotTables.map((table) => [table, []])
  );
  tables.factories = [{ id: 'factory-1' }];
  return {
    schemaVersion: LATEST_SCHEMA_VERSION,
    factoryId: 'factory-1',
    capturedAt: '2026-11-20T00:00:00.000Z',
    tables,
  };
}

describe('validateCloudSnapshot', () => {
  it('accepts a complete snapshot for the requested factory', () => {
    expect(validateCloudSnapshot(validSnapshot(), 'factory-1').factoryId).toBe('factory-1');
  });

  it('rejects missing tables and rows belonging to another factory', () => {
    const missingTable = validSnapshot();
    delete missingTable.tables.sales;
    expect(() => validateCloudSnapshot(missingTable)).toThrow('invalid_snapshot');

    const wrongFactory = validSnapshot();
    wrongFactory.tables.customers = [{ factory_id: 'other-factory' }];
    expect(() => validateCloudSnapshot(wrongFactory)).toThrow('invalid_snapshot');
  });

  it('rejects snapshots from a different local schema version', () => {
    const outdated = { ...validSnapshot(), schemaVersion: LATEST_SCHEMA_VERSION - 1 };
    expect(() => validateCloudSnapshot(outdated)).toThrow('invalid_snapshot');
  });
});
