import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import { afnEquivalent, type Currency } from '@/domain/money';
import { calculateSaleLineMinor, calculateSalePaymentStatus } from '@/domain/sales';
import { toUtcIso } from '@/lib/time';

import { recordAuditEvent } from './audit';
import { enqueueOutbox } from './outbox';
import { getLatestRate } from './rates';
import type { Customer, Sale } from '../types';

export interface SaveCustomerInput {
  factoryId: string;
  id?: string;
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
  now?: string;
}

export interface PostSaleInput {
  factoryId: string;
  customerId: string;
  saleDate: string;
  currency: Currency;
  quantityGrams: number;
  unitPriceMinor: number;
  paymentCurrency: Currency;
  paidMinor: number;
  reference?: string;
  notes?: string;
  now?: string;
}

interface CustomerRow {
  id: string;
  factory_id: string;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

interface SaleRow {
  id: string;
  customer_id: string;
  customer_name: string;
  sale_date: string;
  currency: Currency;
  total_original_minor: number;
  total_afn: number;
  exchange_rate_milli: number | null;
  paid_afn: number;
  outstanding_afn: number;
  payment_status: 'unpaid' | 'partial' | 'paid';
  reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface SaleItemRow {
  id: string;
  finished_product_id: string;
  quantity_grams: number;
  unit_price_minor: number;
  line_total_minor: number;
}

function mapCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    factoryId: row.factory_id,
    name: row.name,
    phone: row.phone,
    address: row.address,
    notes: row.notes,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getCustomers(
  db: SQLiteDatabase,
  factoryId: string,
  includeInactive = false
): Promise<Customer[]> {
  const rows = await db.getAllAsync<CustomerRow>(
    `SELECT *
       FROM customers
      WHERE factory_id = ? AND deleted_at IS NULL
        ${includeInactive ? '' : 'AND is_active = 1'}
      ORDER BY name ASC`,
    factoryId
  );
  return rows.map(mapCustomer);
}

export async function saveCustomer(
  db: SQLiteDatabase,
  input: SaveCustomerInput
): Promise<Customer> {
  const name = input.name.trim();
  if (name.length < 2) throw new Error('نام مشتری باید حداقل دو حرف باشد.');
  const now = input.now ?? toUtcIso();
  const id = input.id ?? randomUUID();

  await db.withTransactionAsync(async () => {
    if (input.id) {
      await db.runAsync(
        `UPDATE customers
            SET name = ?, phone = ?, address = ?, notes = ?, updated_at = ?
          WHERE id = ? AND factory_id = ?`,
        name,
        input.phone?.trim() || null,
        input.address?.trim() || null,
        input.notes?.trim() || null,
        now,
        input.id,
        input.factoryId
      );
    } else {
      await db.runAsync(
        `INSERT INTO customers
           (id, factory_id, name, phone, address, notes, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        id,
        input.factoryId,
        name,
        input.phone?.trim() || null,
        input.address?.trim() || null,
        input.notes?.trim() || null,
        now,
        now
      );
    }

    await recordAuditEvent(db, {
      factoryId: input.factoryId,
      eventType: input.id ? 'customer.updated' : 'customer.created',
      entityType: 'customer',
      entityId: id,
      details: { name },
    }, now);
    await enqueueOutbox(db, {
      factoryId: input.factoryId,
      entityType: 'customer',
      entityId: id,
    }, now);
  });

  const row = await db.getFirstAsync<CustomerRow>(
    'SELECT * FROM customers WHERE id = ? AND factory_id = ?',
    id,
    input.factoryId
  );
  if (!row) throw new Error('ذخیره مشتری ناموفق بود.');
  return mapCustomer(row);
}

export async function postSale(
  db: SQLiteDatabase,
  input: PostSaleInput
): Promise<Sale> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.saleDate)) {
    throw new Error('تاریخ فروش معتبر نیست.');
  }
  if (!Number.isInteger(input.quantityGrams) || input.quantityGrams <= 0 ||
      !Number.isInteger(input.unitPriceMinor) || input.unitPriceMinor < 0 ||
      !Number.isInteger(input.paidMinor) || input.paidMinor < 0) {
    throw new Error('معلومات فروش معتبر نیست.');
  }

  const now = input.now ?? toUtcIso();
  let saleId = '';

  await db.withTransactionAsync(async () => {
    const customer = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM customers WHERE id = ? AND factory_id = ? AND is_active = 1',
      input.customerId,
      input.factoryId
    );
    if (!customer) throw new Error('مشتری معتبر انتخاب نشده است.');

    let saleRateMilli: number | null = null;
    if (input.currency === 'USD') {
      const rate = await getLatestRate(db, input.factoryId);
      if (!rate) throw new Error('برای فروش دالر ابتدا نرخ روز را ثبت کنید.');
      saleRateMilli = rate.rateMilli;
    }

    let paymentRateMilli: number | null = null;
    if (input.paymentCurrency === 'USD') {
      const rate = await getLatestRate(db, input.factoryId);
      if (!rate) throw new Error('برای دریافت به دالر ابتدا نرخ روز را ثبت کنید.');
      paymentRateMilli = rate.rateMilli;
    }

    const finished = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM finished_products
        WHERE factory_id = ? AND is_active = 1 AND deleted_at IS NULL
        ORDER BY created_at ASC LIMIT 1`,
      input.factoryId
    );
    if (!finished) throw new Error('محصول نهایی تعریف نشده است.');

    const balanceRow = await db.getFirstAsync<{ balance: number }>(
      `SELECT COALESCE(SUM(quantity_grams), 0) AS balance
         FROM stock_movements
        WHERE factory_id = ? AND stock_type = 'finished_product'`,
      input.factoryId
    );
    const finishedBalance = balanceRow?.balance ?? 0;
    if (input.quantityGrams > finishedBalance) {
      throw new Error('مقدار فروش از موجودی محصول نهایی بیشتر است.');
    }

    const totalOriginalMinor = calculateSaleLineMinor(
      input.quantityGrams,
      input.unitPriceMinor
    );
    const totalAfn = afnEquivalent(
      input.currency,
      totalOriginalMinor,
      saleRateMilli ?? 1000
    );
    const paidAfn = afnEquivalent(
      input.paymentCurrency,
      input.paidMinor,
      paymentRateMilli ?? 1000
    );
    if (paidAfn > totalAfn) throw new Error('مبلغ دریافت‌شده از مجموع فروش بیشتر است.');

    const outstandingAfn = totalAfn - paidAfn;
    const paymentStatus = calculateSalePaymentStatus(totalAfn, paidAfn);
    saleId = randomUUID();

    await db.runAsync(
      `INSERT INTO sales
         (id, factory_id, customer_id, sale_date, currency,
          total_original_minor, total_afn, exchange_rate_milli,
          paid_afn, outstanding_afn, payment_status,
          reference, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      saleId,
      input.factoryId,
      input.customerId,
      input.saleDate,
      input.currency,
      totalOriginalMinor,
      totalAfn,
      saleRateMilli,
      paidAfn,
      outstandingAfn,
      paymentStatus,
      input.reference?.trim() || null,
      input.notes?.trim() || null,
      now,
      now
    );

    const itemId = randomUUID();
    await db.runAsync(
      `INSERT INTO sale_items
         (id, factory_id, sale_id, finished_product_id, quantity_grams,
          unit_price_minor, line_total_minor, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      itemId,
      input.factoryId,
      saleId,
      finished.id,
      input.quantityGrams,
      input.unitPriceMinor,
      totalOriginalMinor,
      now
    );

    const resultingFinished = finishedBalance - input.quantityGrams;
    const finishedMovementId = randomUUID();
    await db.runAsync(
      `INSERT INTO stock_movements
         (id, factory_id, stock_type, stock_item_id, quantity_grams,
          resulting_balance_grams, movement_type, source_type, source_id, memo, occurred_at, created_at)
       VALUES (?, ?, 'finished_product', ?, ?, ?, 'sale', 'sale', ?, ?, ?, ?)`,
      finishedMovementId,
      input.factoryId,
      finished.id,
      -input.quantityGrams,
      resultingFinished,
      saleId,
      input.reference?.trim() || null,
      now,
      now
    );
    await enqueueOutbox(db, {
      factoryId: input.factoryId,
      entityType: 'stock_movement',
      entityId: finishedMovementId,
    }, now);

    if (input.paidMinor > 0) {
      const paymentId = randomUUID();
      await db.runAsync(
        `INSERT INTO customer_payments
           (id, factory_id, customer_id, sale_id, payment_currency,
            amount_minor, afn_equivalent, exchange_rate_milli,
            paid_at, memo, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'دریافت فروش', ?)`,
        paymentId,
        input.factoryId,
        input.customerId,
        saleId,
        input.paymentCurrency,
        input.paidMinor,
        paidAfn,
        paymentRateMilli,
        now,
        now
      );

      const account = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM cash_accounts WHERE factory_id = ? AND currency = ? AND is_active = 1',
        input.factoryId,
        input.paymentCurrency
      );
      if (!account) throw new Error('حساب نقدی برای دریافت پیدا نشد.');

      const cashMovementId = randomUUID();
      await db.runAsync(
        `INSERT INTO cash_movements
           (id, factory_id, account_id, currency, amount_minor, source_type,
            source_id, occurred_at, memo, created_at)
         VALUES (?, ?, ?, ?, ?, 'sale_payment', ?, ?, 'دریافت فروش', ?)`,
        cashMovementId,
        input.factoryId,
        account.id,
        input.paymentCurrency,
        input.paidMinor,
        saleId,
        now,
        now
      );
      await enqueueOutbox(db, {
        factoryId: input.factoryId,
        entityType: 'customer_payment',
        entityId: paymentId,
      }, now);
      await enqueueOutbox(db, {
        factoryId: input.factoryId,
        entityType: 'cash_movement',
        entityId: cashMovementId,
      }, now);
    }

    await recordAuditEvent(db, {
      factoryId: input.factoryId,
      eventType: 'sale.posted',
      entityType: 'sale',
      entityId: saleId,
      details: {
        currency: input.currency,
        quantityGrams: input.quantityGrams,
        totalOriginalMinor,
        totalAfn,
        paidAfn,
        paymentStatus,
      },
    }, now);
    await enqueueOutbox(db, {
      factoryId: input.factoryId,
      entityType: 'sale',
      entityId: saleId,
    }, now);
  });

  const sale = await getSale(db, input.factoryId, saleId);
  if (!sale) throw new Error('ثبت فروش ناموفق بود.');
  return sale;
}

export async function getSales(
  db: SQLiteDatabase,
  factoryId: string,
  limit = 50
): Promise<Sale[]> {
  const rows = await db.getAllAsync<SaleRow>(
    `SELECT s.*, c.name AS customer_name
       FROM sales s
       JOIN customers c ON c.id = s.customer_id
      WHERE s.factory_id = ? AND s.deleted_at IS NULL
      ORDER BY s.sale_date DESC, s.created_at DESC
      LIMIT ?`,
    factoryId,
    limit
  );
  const sales: Sale[] = [];
  for (const row of rows) {
    const itemRows = await db.getAllAsync<SaleItemRow>(
      `SELECT * FROM sale_items
        WHERE sale_id = ? AND factory_id = ?
        ORDER BY created_at ASC`,
      row.id,
      factoryId
    );
    sales.push({
      id: row.id,
      customerId: row.customer_id,
      customerName: row.customer_name,
      saleDate: row.sale_date,
      currency: row.currency,
      totalOriginalMinor: row.total_original_minor,
      totalAfn: row.total_afn,
      exchangeRateMilli: row.exchange_rate_milli,
      paidAfn: row.paid_afn,
      outstandingAfn: row.outstanding_afn,
      paymentStatus: row.payment_status,
      reference: row.reference,
      notes: row.notes,
      items: itemRows.map((item) => ({
        id: item.id,
        finishedProductId: item.finished_product_id,
        quantityGrams: item.quantity_grams,
        unitPriceMinor: item.unit_price_minor,
        lineTotalMinor: item.line_total_minor,
      })),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
  return sales;
}

export async function getSale(
  db: SQLiteDatabase,
  factoryId: string,
  saleId: string
): Promise<Sale | null> {
  const rows = await getSales(db, factoryId, 1000);
  return rows.find((row) => row.id === saleId) ?? null;
}
