import type { SQLiteDatabase } from 'expo-sqlite';

const SQL = `
ALTER TABLE raw_materials ADD COLUMN photo_uri TEXT;
ALTER TABLE finished_products ADD COLUMN photo_uri TEXT;
`;

export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(SQL);
}
