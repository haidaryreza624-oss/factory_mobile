import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import { validateFinanceAmountAfn } from '@/domain/finance';
import { toUtcIso } from '@/lib/time';

import { recordAuditEvent } from './audit';
import { enqueueOutbox } from './outbox';
import type {
  BusinessExpense,
  FinanceCategory,
  PersonalTransaction,
} from '../types';

interface CategoryRow {
  id: string;
  name: string;
  scope: 'business' | 'personal';
  is_active: number;
  created_at: string;
  updated_at: string;
}

interface BusinessExpenseRow {
  id: string;
  category_id: string;
  category_name: string;
  expense_date: string;
  amount_afn: number;
  description: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface PersonalTransactionRow {
  id: string;
  category_id: string | null;
  category_name: string | null;
  transaction_type: 'income' | 'expense';
  transaction_date: string;
  amount_afn: number;
  description: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function mapCategory(row: CategoryRow): FinanceCategory {
  return {
    id: row.id,
    name: row.name,
    scope: row.scope,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function ensureDefaultCategories(
  db: SQLiteDatabase,
  factoryId: string,
  now: string
): Promise<void> {
  const defaults: Record<'business' | 'personal', string[]> = {
    business: ['برق', 'کرایه', 'ترانسپورت', 'تعمیرات ماشین', 'تیل', 'بسته‌بندی', 'سایر'],
    personal: ['معاش', 'خوراک', 'حمل و نقل', 'خانه', 'سایر'],
  };
  for (const scope of ['business', 'personal'] as const) {
    for (const name of defaults[scope]) {
      await db.runAsync(
        `INSERT OR IGNORE INTO expense_categories
           (id, factory_id, name, scope, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, 1, ?, ?)`,
        randomUUID(),
        factoryId,
        name,
        scope,
        now,
        now
      );
    }
  }
}

export async function getFinanceCategories(
  db: SQLiteDatabase,
  factoryId: string,
  scope: 'business' | 'personal',
  includeInactive = false
): Promise<FinanceCategory[]> {
  await ensureDefaultCategories(db, factoryId, toUtcIso());
  const rows = await db.getAllAsync<CategoryRow>(
    `SELECT *
       FROM expense_categories
      WHERE factory_id = ? AND scope = ? AND deleted_at IS NULL
        ${includeInactive ? '' : 'AND is_active = 1'}
      ORDER BY name ASC`,
    factoryId,
    scope
  );
  return rows.map(mapCategory);
}

export async function saveFinanceCategory(
  db: SQLiteDatabase,
  factoryId: string,
  name: string,
  scope: 'business' | 'personal',
  id?: string,
  now = toUtcIso()
): Promise<FinanceCategory> {
  const trimmed = name.trim();
  if (trimmed.length < 2) throw new Error('نام دسته‌بندی معتبر نیست.');
  const categoryId = id ?? randomUUID();

  await db.withTransactionAsync(async () => {
    if (id) {
      await db.runAsync(
        `UPDATE expense_categories
            SET name = ?, updated_at = ?
          WHERE id = ? AND factory_id = ? AND scope = ?`,
        trimmed,
        now,
        id,
        factoryId,
        scope
      );
    } else {
      await db.runAsync(
        `INSERT INTO expense_categories
           (id, factory_id, name, scope, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, 1, ?, ?)`,
        categoryId,
        factoryId,
        trimmed,
        scope,
        now,
        now
      );
    }
    await recordAuditEvent(db, {
      factoryId,
      eventType: id ? 'finance_category.updated' : 'finance_category.created',
      entityType: 'finance_category',
      entityId: categoryId,
      details: { scope, name: trimmed },
    }, now);
    await enqueueOutbox(db, {
      factoryId,
      entityType: 'finance_category',
      entityId: categoryId,
    }, now);
  });

  const row = await db.getFirstAsync<CategoryRow>(
    'SELECT * FROM expense_categories WHERE id = ? AND factory_id = ?',
    categoryId,
    factoryId
  );
  if (!row) throw new Error('ذخیره دسته‌بندی ناموفق بود.');
  return mapCategory(row);
}

export async function postBusinessExpense(
  db: SQLiteDatabase,
  input: {
    factoryId: string;
    categoryId: string;
    expenseDate: string;
    amountAfn: number;
    description?: string;
    notes?: string;
    now?: string;
  }
): Promise<BusinessExpense> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.expenseDate)) {
    throw new Error('تاریخ مصارف معتبر نیست.');
  }
  validateFinanceAmountAfn(input.amountAfn);
  const now = input.now ?? toUtcIso();
  const expenseId = randomUUID();

  await db.withTransactionAsync(async () => {
    const category = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM expense_categories
        WHERE id = ? AND factory_id = ? AND scope = 'business' AND is_active = 1`,
      input.categoryId,
      input.factoryId
    );
    if (!category) throw new Error('دسته‌بندی مصارف معتبر نیست.');

    const afnBalance = await db.getFirstAsync<{ balance: number }>(
      `SELECT COALESCE(SUM(amount_minor), 0) AS balance
         FROM cash_movements
        WHERE factory_id = ? AND currency = 'AFN'`,
      input.factoryId
    );
    if ((afnBalance?.balance ?? 0) < input.amountAfn) {
      throw new Error('نقدی افغانی برای این مصارف کافی نیست.');
    }

    await db.runAsync(
      `INSERT INTO business_expenses
         (id, factory_id, category_id, expense_date, amount_afn,
          description, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      expenseId,
      input.factoryId,
      input.categoryId,
      input.expenseDate,
      input.amountAfn,
      input.description?.trim() || null,
      input.notes?.trim() || null,
      now,
      now
    );

    const account = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM cash_accounts
        WHERE factory_id = ? AND currency = 'AFN' AND is_active = 1`,
      input.factoryId
    );
    if (!account) throw new Error('حساب نقدی افغانی پیدا نشد.');

    const cashMovementId = randomUUID();
    await db.runAsync(
      `INSERT INTO cash_movements
         (id, factory_id, account_id, currency, amount_minor, source_type,
          source_id, occurred_at, memo, created_at)
       VALUES (?, ?, ?, 'AFN', ?, 'business_expense', ?, ?, ?, ?)`,
      cashMovementId,
      input.factoryId,
      account.id,
      -input.amountAfn,
      expenseId,
      now,
      input.description?.trim() || input.notes?.trim() || 'مصرف فابریکه',
      now
    );
    await enqueueOutbox(db, {
      factoryId: input.factoryId,
      entityType: 'cash_movement',
      entityId: cashMovementId,
    }, now);

    await recordAuditEvent(db, {
      factoryId: input.factoryId,
      eventType: 'business_expense.posted',
      entityType: 'business_expense',
      entityId: expenseId,
      details: { amountAfn: input.amountAfn, categoryId: input.categoryId },
    }, now);
    await enqueueOutbox(db, {
      factoryId: input.factoryId,
      entityType: 'business_expense',
      entityId: expenseId,
    }, now);
  });

  return (await getBusinessExpenses(db, input.factoryId, 1000))
    .find((expense) => expense.id === expenseId) as BusinessExpense;
}

export async function getBusinessExpenses(
  db: SQLiteDatabase,
  factoryId: string,
  limit = 50
): Promise<BusinessExpense[]> {
  const rows = await db.getAllAsync<BusinessExpenseRow>(
    `SELECT e.*, c.name AS category_name
       FROM business_expenses e
       JOIN expense_categories c ON c.id = e.category_id
      WHERE e.factory_id = ? AND e.deleted_at IS NULL
      ORDER BY e.expense_date DESC, e.created_at DESC
      LIMIT ?`,
    factoryId,
    limit
  );
  return rows.map((row) => ({
    id: row.id,
    categoryId: row.category_id,
    categoryName: row.category_name,
    expenseDate: row.expense_date,
    amountAfn: row.amount_afn,
    description: row.description,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function postPersonalTransaction(
  db: SQLiteDatabase,
  input: {
    factoryId: string;
    categoryId?: string;
    transactionType: 'income' | 'expense';
    transactionDate: string;
    amountAfn: number;
    description?: string;
    notes?: string;
    now?: string;
  }
): Promise<PersonalTransaction> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.transactionDate)) {
    throw new Error('تاریخ مالی شخصی معتبر نیست.');
  }
  validateFinanceAmountAfn(input.amountAfn);
  const now = input.now ?? toUtcIso();
  const transactionId = randomUUID();

  await db.withTransactionAsync(async () => {
    if (input.categoryId) {
      const category = await db.getFirstAsync<{ id: string }>(
        `SELECT id FROM expense_categories
          WHERE id = ? AND factory_id = ? AND scope = 'personal' AND is_active = 1`,
        input.categoryId,
        input.factoryId
      );
      if (!category) throw new Error('دسته‌بندی شخصی معتبر نیست.');
    }
    await db.runAsync(
      `INSERT INTO personal_transactions
         (id, factory_id, category_id, transaction_type, transaction_date,
          amount_afn, description, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      transactionId,
      input.factoryId,
      input.categoryId ?? null,
      input.transactionType,
      input.transactionDate,
      input.amountAfn,
      input.description?.trim() || null,
      input.notes?.trim() || null,
      now,
      now
    );
    await recordAuditEvent(db, {
      factoryId: input.factoryId,
      eventType: 'personal_transaction.posted',
      entityType: 'personal_transaction',
      entityId: transactionId,
      details: { transactionType: input.transactionType, amountAfn: input.amountAfn },
    }, now);
    await enqueueOutbox(db, {
      factoryId: input.factoryId,
      entityType: 'personal_transaction',
      entityId: transactionId,
    }, now);
  });

  return (await getPersonalTransactions(db, input.factoryId, 1000))
    .find((transaction) => transaction.id === transactionId) as PersonalTransaction;
}

export async function getPersonalTransactions(
  db: SQLiteDatabase,
  factoryId: string,
  limit = 50
): Promise<PersonalTransaction[]> {
  const rows = await db.getAllAsync<PersonalTransactionRow>(
    `SELECT t.*, c.name AS category_name
       FROM personal_transactions t
       LEFT JOIN expense_categories c ON c.id = t.category_id
      WHERE t.factory_id = ? AND t.deleted_at IS NULL
      ORDER BY t.transaction_date DESC, t.created_at DESC
      LIMIT ?`,
    factoryId,
    limit
  );
  return rows.map((row) => ({
    id: row.id,
    categoryId: row.category_id,
    categoryName: row.category_name,
    transactionType: row.transaction_type,
    transactionDate: row.transaction_date,
    amountAfn: row.amount_afn,
    description: row.description,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}
