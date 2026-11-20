import type { SQLiteDatabase } from 'expo-sqlite';

export interface ReportSnapshot {
  salesPaidAfn: number;
  purchasesPaidAfn: number;
  salesLoanAfn: number;
  purchasesLoanAfn: number;
  businessExpensesAfn: number;
  productionOutputGrams: number;
  finishedStockGrams: number;
}

export interface FinishedStockReportMovement {
  occurredAt: string;
  quantityGrams: number;
}

export async function getFinishedStockReportMovements(
  db: SQLiteDatabase,
  factoryId: string
): Promise<FinishedStockReportMovement[]> {
  const rows = await db.getAllAsync<{
    occurred_at: string;
    quantity_grams: number;
  }>(
    `SELECT occurred_at, quantity_grams
       FROM stock_movements
      WHERE factory_id = ? AND stock_type = 'finished_product'
      ORDER BY occurred_at ASC, created_at ASC`,
    factoryId
  );
  return rows.map((row) => ({
    occurredAt: row.occurred_at,
    quantityGrams: row.quantity_grams,
  }));
}

export async function getReportSnapshot(
  db: SQLiteDatabase,
  factoryId: string
): Promise<ReportSnapshot> {
  const sum = async (sql: string): Promise<number> => {
    const row = await db.getFirstAsync<{ value: number }>(sql, factoryId);
    return row?.value ?? 0;
  };

  const [
    salesPaidAfn,
    purchasesPaidAfn,
    salesLoanAfn,
    purchasesLoanAfn,
    businessExpensesAfn,
    productionOutputGrams,
    finishedStockGrams,
  ] = await Promise.all([
    sum(`SELECT COALESCE(SUM(paid_afn), 0) AS value FROM sales WHERE factory_id = ? AND deleted_at IS NULL`),
    sum(`SELECT COALESCE(SUM(paid_afn), 0) AS value FROM purchases WHERE factory_id = ? AND deleted_at IS NULL`),
    sum(`SELECT COALESCE(SUM(outstanding_afn), 0) AS value FROM sales WHERE factory_id = ? AND deleted_at IS NULL`),
    sum(`SELECT COALESCE(SUM(outstanding_afn), 0) AS value FROM purchases WHERE factory_id = ? AND deleted_at IS NULL`),
    sum(`SELECT COALESCE(SUM(amount_afn), 0) AS value FROM business_expenses WHERE factory_id = ? AND deleted_at IS NULL`),
    sum(`SELECT COALESCE(SUM(actual_output_grams), 0) AS value FROM production_batches WHERE factory_id = ? AND deleted_at IS NULL`),
    sum(`SELECT COALESCE(SUM(quantity_grams), 0) AS value FROM stock_movements WHERE factory_id = ? AND stock_type = 'finished_product'`),
  ]);

  return {
    salesPaidAfn,
    purchasesPaidAfn,
    salesLoanAfn,
    purchasesLoanAfn,
    businessExpensesAfn,
    productionOutputGrams,
    finishedStockGrams,
  };
}

export async function getBusinessCsv(
  db: SQLiteDatabase,
  factoryId: string
): Promise<string> {
  const escape = (value: unknown): string => {
    const text = value == null ? '' : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };

  const sales = await db.getAllAsync<Record<string, unknown>>(
    `SELECT sale_date, customer_id, currency, total_original_minor,
            total_afn, paid_afn, outstanding_afn, payment_status
       FROM sales WHERE factory_id = ? AND deleted_at IS NULL
       ORDER BY sale_date DESC`,
    factoryId
  );
  const purchases = await db.getAllAsync<Record<string, unknown>>(
    `SELECT purchase_date, supplier_id, currency, total_original_minor,
            total_afn, paid_afn, outstanding_afn, payment_status
       FROM purchases WHERE factory_id = ? AND deleted_at IS NULL
       ORDER BY purchase_date DESC`,
    factoryId
  );
  const expenses = await db.getAllAsync<Record<string, unknown>>(
    `SELECT expense_date, amount_afn, description, notes
       FROM business_expenses WHERE factory_id = ? AND deleted_at IS NULL
       ORDER BY expense_date DESC`,
    factoryId
  );

  const sections = [
    ['SALES', ['sale_date', 'customer_id', 'currency', 'total_original_minor', 'total_afn', 'paid_afn', 'outstanding_afn', 'payment_status']],
    ['PURCHASES', ['purchase_date', 'supplier_id', 'currency', 'total_original_minor', 'total_afn', 'paid_afn', 'outstanding_afn', 'payment_status']],
    ['BUSINESS_EXPENSES', ['expense_date', 'amount_afn', 'description', 'notes']],
  ];
  const rows: string[] = [];

  const appendSection = (title: string, headers: string[], data: Record<string, unknown>[]) => {
    rows.push(title);
    rows.push(headers.map(escape).join(','));
    for (const item of data) {
      rows.push(headers.map((header) => escape(item[header])).join(','));
    }
  };

  appendSection(sections[0][0] as string, sections[0][1] as string[], sales);
  rows.push('');
  appendSection(sections[1][0] as string, sections[1][1] as string[], purchases);
  rows.push('');
  appendSection(sections[2][0] as string, sections[2][1] as string[], expenses);

  return `\uFEFF${rows.join('\n')}`;
}
