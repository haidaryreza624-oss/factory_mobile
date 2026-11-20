import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import { afnEquivalent, type Currency } from '@/domain/money';
import { applyOriginalCurrencyPayment } from '@/domain/finance';
import { calculateSaleLineMinor, calculateSalePaymentStatus } from '@/domain/sales';
import { getKabulDateISO, toUtcIso } from '@/lib/time';

import { recordAuditEvent } from './audit';
import { enqueueOutbox } from './outbox';
import { getRateForDate } from './rates';
import type { CashFlowTotals, Customer, RecordedPayment, Sale } from '../types';

export interface SaveCustomerInput {
  factoryId: string;
  id?: string;
  name: string;
  phone?: string;
  address?: string;
  photoUri?: string | null;
  notes?: string;
  now?: string;
}

export interface PostSaleInput {
  factoryId: string;
  customerId: string;
  finishedProductId: string;
  saleDate: string;
  currency: Currency;
  quantityGrams: number;
  unitPriceMinor: number;
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
  photo_uri: string | null;
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
  finished_product_name: string;
  quantity_grams: number;
  unit_price_minor: number;
  line_total_minor: number;
}

interface CustomerPaymentRow {
  payment_currency: Currency;
  amount_minor: number;
  exchange_rate_milli: number | null;
  paid_at: string;
}

function mapCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    factoryId: row.factory_id,
    name: row.name,
    phone: row.phone,
    address: row.address,
    photoUri: row.photo_uri,
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
            SET name = ?, phone = ?, address = ?, photo_uri = ?, notes = ?, updated_at = ?
          WHERE id = ? AND factory_id = ?`,
        name,
        input.phone?.trim() || null,
        input.address?.trim() || null,
        input.photoUri ?? null,
        input.notes?.trim() || null,
        now,
        input.id,
        input.factoryId
      );
    } else {
      await db.runAsync(
        `INSERT INTO customers
           (id, factory_id, name, phone, address, photo_uri, notes, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        id,
        input.factoryId,
        name,
        input.phone?.trim() || null,
        input.address?.trim() || null,
        input.photoUri ?? null,
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

export async function deleteCustomer(
  db: SQLiteDatabase,
  factoryId: string,
  customerId: string,
  now = toUtcIso()
): Promise<void> {
  await db.withTransactionAsync(async () => {
    const customer = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM customers
        WHERE id = ? AND factory_id = ? AND deleted_at IS NULL`,
      customerId,
      factoryId
    );
    if (!customer) throw new Error('مشتری پیدا نشد.');

    await db.runAsync(
      `UPDATE customers
          SET is_active = 0, deleted_at = ?, updated_at = ?
        WHERE id = ? AND factory_id = ?`,
      now,
      now,
      customerId,
      factoryId
    );
    await recordAuditEvent(db, {
      factoryId,
      eventType: 'customer.deleted',
      entityType: 'customer',
      entityId: customerId,
    }, now);
    await enqueueOutbox(db, {
      factoryId,
      entityType: 'customer',
      entityId: customerId,
    }, now);
  });
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
      const rate = await getRateForDate(db, input.factoryId, input.saleDate);
      if (!rate) throw new Error('برای فروش دالر ابتدا نرخ روز را ثبت کنید.');
      saleRateMilli = rate.rateMilli;
    }

    const finished = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM finished_products
        WHERE id = ? AND factory_id = ? AND is_active = 1 AND deleted_at IS NULL`,
      input.finishedProductId,
      input.factoryId
    );
    if (!finished) throw new Error('محصول نهایی معتبر انتخاب نشده است.');

    const balanceRow = await db.getFirstAsync<{ balance: number }>(
      `SELECT COALESCE(SUM(quantity_grams), 0) AS balance
         FROM stock_movements
        WHERE factory_id = ? AND stock_type = 'finished_product'
          AND stock_item_id = ?`,
      input.factoryId,
      finished.id
    );
    const finishedBalance = balanceRow?.balance ?? 0;
    if (input.quantityGrams > finishedBalance) {
      throw new Error('مقدار فروش از موجودی محصول انتخاب‌شده بیشتر است.');
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
      input.currency,
      input.paidMinor,
      saleRateMilli ?? 1000
    );
    if (input.paidMinor > 0 && paidAfn <= 0) {
      throw new Error('مبلغ دریافت‌شده برای تبدیل به افغانی کافی نیست.');
    }
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
        input.currency,
        input.paidMinor,
        paidAfn,
        saleRateMilli,
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
         VALUES (?, ?, ?, 'AFN', ?, 'sale_payment', ?, ?, 'دریافت فروش', ?)`,
        cashMovementId,
        input.factoryId,
        account.id,
        paidAfn,
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
  limit: number | null = 50,
  customerId: string | null = null,
  saleId: string | null = null
): Promise<Sale[]> {
  const rows = await db.getAllAsync<SaleRow>(
    `SELECT s.*, c.name AS customer_name
       FROM sales s
       JOIN customers c ON c.id = s.customer_id
      WHERE s.factory_id = ? AND s.deleted_at IS NULL
        AND (? IS NULL OR s.customer_id = ?)
        AND (? IS NULL OR s.id = ?)
      ORDER BY s.sale_date DESC, s.created_at DESC
      ${limit === null ? '' : 'LIMIT ?'}`,
    ...(limit === null
      ? [factoryId, customerId, customerId, saleId, saleId]
      : [factoryId, customerId, customerId, saleId, saleId, limit])
  );
  const sales: Sale[] = [];
  for (const row of rows) {
    const itemRows = await db.getAllAsync<SaleItemRow>(
      `SELECT item.*, product.name AS finished_product_name
         FROM sale_items AS item
         JOIN finished_products AS product ON product.id = item.finished_product_id
        WHERE item.sale_id = ? AND item.factory_id = ?
        ORDER BY item.created_at ASC`,
      row.id,
      factoryId
    );
    const paymentRows = await db.getAllAsync<CustomerPaymentRow>(
      `SELECT payment_currency, amount_minor, exchange_rate_milli, paid_at
         FROM customer_payments
        WHERE sale_id = ? AND factory_id = ?
        ORDER BY paid_at ASC, created_at ASC`,
      row.id,
      factoryId
    );
    const paidOriginalMinor = paymentRows.reduce(
      (total, payment) =>
        payment.payment_currency === row.currency
          ? total + payment.amount_minor
          : total,
      0
    );
    const originalBalance = applyOriginalCurrencyPayment(
      row.total_original_minor,
      Math.min(row.total_original_minor, paidOriginalMinor),
      0
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
      outstandingOriginalMinor: originalBalance.outstandingOriginalMinor,
      paymentStatus: originalBalance.paymentStatus,
      reference: row.reference,
      notes: row.notes,
      items: itemRows.map((item) => ({
        id: item.id,
        finishedProductId: item.finished_product_id,
        finishedProductName: item.finished_product_name,
        quantityGrams: item.quantity_grams,
        unitPriceMinor: item.unit_price_minor,
        lineTotalMinor: item.line_total_minor,
      })),
      payments: paymentRows.map((payment): RecordedPayment => ({
        currency: payment.payment_currency,
        amountMinor: payment.amount_minor,
        exchangeRateMilli: payment.exchange_rate_milli,
        paidAt: payment.paid_at,
      })),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
  return sales;
}

export async function getSalesForCustomer(
  db: SQLiteDatabase,
  factoryId: string,
  customerId: string
): Promise<Sale[]> {
  return getSales(db, factoryId, null, customerId);
}

export async function recordSalePayment(
  db: SQLiteDatabase,
  input: {
    factoryId: string;
    saleId: string;
    amountMinor: number;
    now?: string;
  }
): Promise<void> {
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw new Error('مبلغ دریافت معتبر نیست.');
  }
  const now = input.now ?? toUtcIso();

  await db.withTransactionAsync(async () => {
    const sale = await db.getFirstAsync<{
      currency: Currency;
      customer_id: string;
      total_original_minor: number;
      total_afn: number;
      paid_afn: number;
      exchange_rate_milli: number | null;
      paid_original_minor: number;
    }>(
      `SELECT sale.currency, sale.customer_id, sale.total_original_minor,
              sale.total_afn, sale.paid_afn, sale.exchange_rate_milli,
              COALESCE((
                SELECT SUM(payment.amount_minor)
                  FROM customer_payments AS payment
                 WHERE payment.sale_id = sale.id
                   AND payment.factory_id = sale.factory_id
                   AND payment.payment_currency = sale.currency
              ), 0) AS paid_original_minor
         FROM sales AS sale
        WHERE sale.id = ? AND sale.factory_id = ?
          AND sale.deleted_at IS NULL`,
      input.saleId,
      input.factoryId
    );
    if (!sale) throw new Error('فروش پیدا نشد.');
    const currentBalance = applyOriginalCurrencyPayment(
      sale.total_original_minor,
      Math.min(sale.total_original_minor, sale.paid_original_minor),
      0
    );
    if (currentBalance.outstandingOriginalMinor <= 0) {
      throw new Error('این فروش قبلاً کامل پرداخت شده است.');
    }
    if (input.amountMinor > currentBalance.outstandingOriginalMinor) {
      throw new Error('مبلغ دریافت از باقی فروش بیشتر است.');
    }

    let paymentRateMilli: number | null = null;
    if (sale.currency === 'USD') {
      const rate = await getRateForDate(db, input.factoryId, getKabulDateISO(new Date(now)));
      if (!rate) throw new Error('برای دریافت به دالر ابتدا نرخ روز را ثبت کنید.');
      paymentRateMilli = rate.rateMilli;
    }

    const paymentAfn = afnEquivalent(
      sale.currency,
      input.amountMinor,
      paymentRateMilli ?? 1000
    );
    if (paymentAfn <= 0) throw new Error('مبلغ دریافت برای کاهش باقی کافی نیست.');
    const balance = applyOriginalCurrencyPayment(
      sale.total_original_minor,
      Math.min(sale.total_original_minor, sale.paid_original_minor),
      input.amountMinor
    );
    const outstandingAfn =
      sale.currency === 'USD' && sale.exchange_rate_milli !== null
        ? afnEquivalent('USD', balance.outstandingOriginalMinor, sale.exchange_rate_milli)
        : sale.total_original_minor === 0
          ? 0
          : Math.round(
              sale.total_afn *
                balance.outstandingOriginalMinor /
                sale.total_original_minor
            );
    const paidAfn = sale.paid_afn + paymentAfn;
    const paymentId = randomUUID();
    await db.runAsync(
      `INSERT INTO customer_payments
         (id, factory_id, customer_id, sale_id, payment_currency,
          amount_minor, afn_equivalent, exchange_rate_milli,
          paid_at, memo, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'پرداخت فروش', ?)`,
      paymentId,
      input.factoryId,
      sale.customer_id,
      input.saleId,
      sale.currency,
      input.amountMinor,
      paymentAfn,
      paymentRateMilli,
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
       VALUES (?, ?, ?, 'AFN', ?, 'sale_payment', ?, ?, 'پرداخت فروش', ?)`,
      cashMovementId,
      input.factoryId,
      account.id,
      paymentAfn,
      input.saleId,
      now,
      now
    );

    await db.runAsync(
      `UPDATE sales
          SET paid_afn = ?, outstanding_afn = ?, payment_status = ?, updated_at = ?
        WHERE id = ? AND factory_id = ?`,
      paidAfn,
      outstandingAfn,
      balance.paymentStatus,
      now,
      input.saleId,
      input.factoryId
    );

    await recordAuditEvent(db, {
      factoryId: input.factoryId,
      eventType: 'sale.payment_received',
      entityType: 'sale',
      entityId: input.saleId,
      details: {
        amountMinor: input.amountMinor,
        paymentCurrency: sale.currency,
        paymentAfn,
      },
    }, now);
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
    await enqueueOutbox(db, {
      factoryId: input.factoryId,
      entityType: 'sale',
      entityId: input.saleId,
    }, now);
  });
}

export async function getSalesCashTotals(
  db: SQLiteDatabase,
  factoryId: string
): Promise<CashFlowTotals> {
  const row = await db.getFirstAsync<{ total_afn: number }>(
    `SELECT COALESCE(SUM(payment.afn_equivalent), 0) AS total_afn
       FROM customer_payments AS payment
       LEFT JOIN sales AS sale
         ON sale.id = payment.sale_id
        AND sale.factory_id = payment.factory_id
      WHERE payment.factory_id = ?
        AND (payment.sale_id IS NULL OR sale.deleted_at IS NULL)`,
    factoryId
  );
  return { afn: row?.total_afn ?? 0 };
}

export async function getSale(
  db: SQLiteDatabase,
  factoryId: string,
  saleId: string
): Promise<Sale | null> {
  const rows = await getSales(db, factoryId, null, null, saleId);
  return rows.find((row) => row.id === saleId) ?? null;
}
