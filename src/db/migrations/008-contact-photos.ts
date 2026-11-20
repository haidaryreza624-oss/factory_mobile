import type { SQLiteDatabase } from 'expo-sqlite';

const SQL = `
ALTER TABLE suppliers ADD COLUMN photo_uri TEXT;
ALTER TABLE customers ADD COLUMN photo_uri TEXT;
`;

export async function up(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(SQL);
}
