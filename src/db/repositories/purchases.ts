import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import { afnEquivalent, type Currency } from '@/domain/money';
import { applyOriginalCurrencyPayment } from '@/domain/finance';
import { calculatePaymentStatus, calculatePurchaseLineMinor } from '@/domain/purchases';
import { getKabulDateISO, toUtcIso } from '@/lib/time';

import { recordAuditEvent } from './audit';
import { enqueueOutbox } from './outbox';
import { getRateForDate } from './rates';
import type {
  CashFlowTotals,
  Purchase,
  PurchaseItem,
  RecordedPayment,
  Supplier,
} from '../types';

export interface SaveSupplierInput {
  factoryId: string;
  id?: string;
  name: string;
  phone?: string;
  address?: string;
  photoUri?: string | null;
  notes?: string;
  now?: string;
}

export interface PurchaseItemInput {
  rawMaterialId: string;
  quantityGrams: number;
  unitPriceMinor: number;
}

export interface PostPurchaseInput {
  factoryId: string;
  supplierId: string;
  purchaseDate: string;
  currency: Currency;
  items: PurchaseItemInput[];
  paidMinor: number;
  reference?: string;
  notes?: string;
  now?: string;
}

interface SupplierRow {
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

interface PurchaseRow {
  id: string;
  supplier_id: string;
  supplier_name: string;
  purchase_date: string;
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

interface PurchaseItemRow {
  id: string;
  raw_material_id: string;
  raw_material_name: string;
  quantity_grams: number;
  unit_price_minor: number;
  line_total_minor: number;
}

interface PurchasePaymentRow {
  payment_currency: Currency;
  amount_minor: number;
  exchange_rate_milli: number | null;
  paid_at: string;
}

function mapSupplier(row: SupplierRow): Supplier {
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

export async function getSuppliers(
  db: SQLiteDatabase,
  factoryId: string,
  includeInactive = false
): Promise<Supplier[]> {
  const rows = await db.getAllAsync<SupplierRow>(
    `SELECT *
       FROM suppliers
      WHERE factory_id = ? AND deleted_at IS NULL
        ${includeInactive ? '' : 'AND is_active = 1'}
      ORDER BY name ASC`,
    factoryId
  );
  return rows.map(mapSupplier);
}

export async function saveSupplier(
  db: SQLiteDatabase,
  input: SaveSupplierInput
): Promise<Supplier> {
  const name = input.name.trim();
  if (name.length < 2) throw new Error('نام عرضه‌کننده باید حداقل دو حرف باشد.');
  const now = input.now ?? toUtcIso();
  const id = input.id ?? randomUUID();

  await db.withTransactionAsync(async () => {
    if (input.id) {
      await db.runAsync(
        `UPDATE suppliers
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
        `INSERT INTO suppliers
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
      eventType: input.id ? 'supplier.updated' : 'supplier.created',
      entityType: 'supplier',
      entityId: id,
      details: { name },
    }, now);
    await enqueueOutbox(db, {
      factoryId: input.factoryId,
      entityType: 'supplier',
      entityId: id,
    }, now);
  });

  const row = await db.getFirstAsync<SupplierRow>(
    'SELECT * FROM suppliers WHERE id = ? AND factory_id = ?',
    id,
    input.factoryId
  );
  if (!row) throw new Error('ذخیره عرضه‌کننده ناموفق بود.');
  return mapSupplier(row);
}

export async function deleteSupplier(
  db: SQLiteDatabase,
  factoryId: string,
  supplierId: string,
  now = toUtcIso()
): Promise<void> {
  await db.withTransactionAsync(async () => {
    const supplier = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM suppliers
        WHERE id = ? AND factory_id = ? AND deleted_at IS NULL`,
      supplierId,
      factoryId
    );
    if (!supplier) throw new Error('عرضه‌کننده پیدا نشد.');

    await db.runAsync(
      `UPDATE suppliers
          SET is_active = 0, deleted_at = ?, updated_at = ?
        WHERE id = ? AND factory_id = ?`,
      now,
      now,
      supplierId,
      factoryId
    );
    await recordAuditEvent(db, {
      factoryId,
      eventType: 'supplier.deleted',
      entityType: 'supplier',
      entityId: supplierId,
    }, now);
    await enqueueOutbox(db, {
      factoryId,
      entityType: 'supplier',
      entityId: supplierId,
    }, now);
  });
}

export async function postPurchase(
  db: SQLiteDatabase,
  input: PostPurchaseInput
): Promise<Purchase> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.purchaseDate)) {
    throw new Error('تاریخ خرید معتبر نیست.');
  }
  if (input.items.length === 0) throw new Error('حداقل یک ماده اولیه را انتخاب کنید.');
  if (!Number.isInteger(input.paidMinor) || input.paidMinor < 0) {
    throw new Error('مبلغ پرداخت معتبر نیست.');
  }

  const now = input.now ?? toUtcIso();
  let purchaseId = '';

  await db.withTransactionAsync(async () => {
    const supplier = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM suppliers WHERE id = ? AND factory_id = ? AND is_active = 1',
      input.supplierId,
      input.factoryId
    );
    if (!supplier) throw new Error('عرضه‌کننده معتبر انتخاب نشده است.');

    let purchaseRateMilli: number | null = null;
    if (input.currency === 'USD') {
      const todayRate = await getRateForDate(db, input.factoryId, input.purchaseDate);
      if (!todayRate) throw new Error('برای خرید دالر ابتدا نرخ روز را ثبت کنید.');
      purchaseRateMilli = todayRate.rateMilli;
    }

    let totalOriginalMinor = 0;
    for (const item of input.items) {
      if (!Number.isInteger(item.quantityGrams) || item.quantityGrams <= 0 ||
          !Number.isInteger(item.unitPriceMinor) || item.unitPriceMinor < 0) {
        throw new Error('معلومات آیتم خرید معتبر نیست.');
      }

      const rawMaterial = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM raw_materials WHERE id = ? AND factory_id = ? AND is_active = 1',
        item.rawMaterialId,
        input.factoryId
      );
      if (!rawMaterial) throw new Error('ماده اولیه معتبر انتخاب نشده است.');

      totalOriginalMinor += calculatePurchaseLineMinor(
        item.quantityGrams,
        item.unitPriceMinor
      );
    }

    const totalAfn = afnEquivalent(
      input.currency,
      totalOriginalMinor,
      purchaseRateMilli ?? 1000
    );

    const paidAfn = input.paidMinor === 0
      ? 0
      : afnEquivalent(input.currency, input.paidMinor, purchaseRateMilli ?? 1000);
    if (input.paidMinor > 0 && paidAfn <= 0) {
      throw new Error('مبلغ پرداخت برای تبدیل به افغانی کافی نیست.');
    }
    if (paidAfn > totalAfn) throw new Error('مبلغ پرداخت از مجموع خرید بیشتر است.');

    const outstandingAfn = totalAfn - paidAfn;
    const paymentStatus = calculatePaymentStatus(totalAfn, paidAfn);

    purchaseId = randomUUID();
    await db.runAsync(
      `INSERT INTO purchases
         (id, factory_id, supplier_id, purchase_date, currency, total_original_minor,
          total_afn, exchange_rate_milli, paid_afn, outstanding_afn, payment_status,
          reference, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      purchaseId,
      input.factoryId,
      input.supplierId,
      input.purchaseDate,
      input.currency,
      totalOriginalMinor,
      totalAfn,
      purchaseRateMilli,
      paidAfn,
      outstandingAfn,
      paymentStatus,
      input.reference?.trim() || null,
      input.notes?.trim() || null,
      now,
      now
    );

    for (const item of input.items) {
      const lineTotalMinor = calculatePurchaseLineMinor(
        item.quantityGrams,
        item.unitPriceMinor
      );
      const itemId = randomUUID();
      await db.runAsync(
        `INSERT INTO purchase_items
           (id, factory_id, purchase_id, raw_material_id, quantity_grams,
            unit_price_minor, line_total_minor, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        itemId,
        input.factoryId,
        purchaseId,
        item.rawMaterialId,
        item.quantityGrams,
        item.unitPriceMinor,
        lineTotalMinor,
        now
      );

      const balance = await db.getFirstAsync<{ balance: number }>(
        `SELECT COALESCE(SUM(quantity_grams), 0) AS balance
           FROM stock_movements
          WHERE factory_id = ? AND stock_type = 'raw_material' AND stock_item_id = ?`,
        input.factoryId,
        item.rawMaterialId
      );
      const resultingBalance = (balance?.balance ?? 0) + item.quantityGrams;
      const movementId = randomUUID();
      await db.runAsync(
        `INSERT INTO stock_movements
           (id, factory_id, stock_type, stock_item_id, quantity_grams,
            resulting_balance_grams, movement_type, source_type, source_id, memo, occurred_at, created_at)
         VALUES (?, ?, 'raw_material', ?, ?, ?, 'purchase', 'purchase', ?, ?, ?, ?)`,
        movementId,
        input.factoryId,
        item.rawMaterialId,
        item.quantityGrams,
        resultingBalance,
        purchaseId,
        input.reference?.trim() || null,
        now,
        now
      );
      await enqueueOutbox(db, {
        factoryId: input.factoryId,
        entityType: 'stock_movement',
        entityId: movementId,
      }, now);
    }

    if (input.paidMinor > 0) {
      const paymentId = randomUUID();
      await db.runAsync(
        `INSERT INTO purchase_payments
           (id, factory_id, purchase_id, payment_currency, amount_minor,
            afn_equivalent, exchange_rate_milli, paid_at, memo, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'پرداخت خرید', ?)`,
        paymentId,
        input.factoryId,
        purchaseId,
        input.currency,
        input.paidMinor,
        paidAfn,
        purchaseRateMilli,
        now,
        now
      );

      const account = await db.getFirstAsync<{ id: string }>(
        `SELECT id FROM cash_accounts
          WHERE factory_id = ? AND currency = 'AFN' AND is_active = 1`,
        input.factoryId
      );
      if (!account) throw new Error('حساب نقدی افغانی پیدا نشد.');

      const movementId = randomUUID();
      await db.runAsync(
        `INSERT INTO cash_movements
           (id, factory_id, account_id, currency, amount_minor, source_type,
            source_id, occurred_at, memo, created_at)
         VALUES (?, ?, ?, 'AFN', ?, 'purchase_payment', ?, ?, 'پرداخت خرید', ?)`,
        movementId,
        input.factoryId,
        account.id,
        -paidAfn,
        purchaseId,
        now,
        now
      );
      await enqueueOutbox(db, {
        factoryId: input.factoryId,
        entityType: 'purchase_payment',
        entityId: paymentId,
      }, now);
      await enqueueOutbox(db, {
        factoryId: input.factoryId,
        entityType: 'cash_movement',
        entityId: movementId,
      }, now);
    }

    await recordAuditEvent(db, {
      factoryId: input.factoryId,
      eventType: 'purchase.posted',
      entityType: 'purchase',
      entityId: purchaseId,
      details: {
        currency: input.currency,
        totalOriginalMinor,
        totalAfn,
        paidAfn,
        paymentStatus,
      },
    }, now);
    await enqueueOutbox(db, {
      factoryId: input.factoryId,
      entityType: 'purchase',
      entityId: purchaseId,
    }, now);
  });

  const purchase = await getPurchase(db, input.factoryId, purchaseId);
  if (!purchase) throw new Error('ثبت خرید ناموفق بود.');
  return purchase;
}

export async function recordPurchasePayment(
  db: SQLiteDatabase,
  input: {
    factoryId: string;
    purchaseId: string;
    amountMinor: number;
    now?: string;
  }
): Promise<void> {
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw new Error('مبلغ پرداخت معتبر نیست.');
  }
  const now = input.now ?? toUtcIso();

  await db.withTransactionAsync(async () => {
    const purchase = await db.getFirstAsync<{
      currency: Currency;
      total_original_minor: number;
      total_afn: number;
      paid_afn: number;
      exchange_rate_milli: number | null;
      paid_original_minor: number;
    }>(
      `SELECT purchase.currency, purchase.total_original_minor,
              purchase.total_afn, purchase.paid_afn,
              purchase.exchange_rate_milli,
              COALESCE((
                SELECT SUM(payment.amount_minor)
                  FROM purchase_payments AS payment
                 WHERE payment.purchase_id = purchase.id
                   AND payment.factory_id = purchase.factory_id
                   AND payment.payment_currency = purchase.currency
              ), 0) AS paid_original_minor
         FROM purchases AS purchase
        WHERE purchase.id = ? AND purchase.factory_id = ?
          AND purchase.deleted_at IS NULL`,
      input.purchaseId,
      input.factoryId
    );
    if (!purchase) throw new Error('خرید پیدا نشد.');
    const currentBalance = applyOriginalCurrencyPayment(
      purchase.total_original_minor,
      Math.min(purchase.total_original_minor, purchase.paid_original_minor),
      0
    );
    if (currentBalance.outstandingOriginalMinor <= 0) {
      throw new Error('این خرید قبلاً کامل پرداخت شده است.');
    }
    if (input.amountMinor > currentBalance.outstandingOriginalMinor) {
      throw new Error('مبلغ پرداخت از باقی خرید بیشتر است.');
    }

    let paymentRateMilli: number | null = null;
    if (purchase.currency === 'USD') {
      const rate = await getRateForDate(db, input.factoryId, getKabulDateISO(new Date(now)));
      if (!rate) throw new Error('برای پرداخت به دالر ابتدا نرخ روز را ثبت کنید.');
      paymentRateMilli = rate.rateMilli;
    }

    const paymentAfn = afnEquivalent(
      purchase.currency,
      input.amountMinor,
      paymentRateMilli ?? 1000
    );
    if (paymentAfn <= 0) throw new Error('مبلغ پرداخت برای کاهش باقی کافی نیست.');
    const balance = applyOriginalCurrencyPayment(
      purchase.total_original_minor,
      Math.min(purchase.total_original_minor, purchase.paid_original_minor),
      input.amountMinor
    );
    const outstandingAfn =
      purchase.currency === 'USD' && purchase.exchange_rate_milli !== null
        ? afnEquivalent('USD', balance.outstandingOriginalMinor, purchase.exchange_rate_milli)
        : purchase.total_original_minor === 0
          ? 0
          : Math.round(
              purchase.total_afn *
                balance.outstandingOriginalMinor /
                purchase.total_original_minor
            );
    const paidAfn = purchase.paid_afn + paymentAfn;
    const paymentId = randomUUID();
    await db.runAsync(
      `INSERT INTO purchase_payments
         (id, factory_id, purchase_id, payment_currency, amount_minor,
          afn_equivalent, exchange_rate_milli, paid_at, memo, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'پرداخت خرید', ?)`,
      paymentId,
      input.factoryId,
      input.purchaseId,
      purchase.currency,
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
       VALUES (?, ?, ?, 'AFN', ?, 'purchase_payment', ?, ?, 'پرداخت خرید', ?)`,
      cashMovementId,
      input.factoryId,
      account.id,
      -paymentAfn,
      input.purchaseId,
      now,
      now
    );

    await db.runAsync(
      `UPDATE purchases
          SET paid_afn = ?, outstanding_afn = ?, payment_status = ?, updated_at = ?
        WHERE id = ? AND factory_id = ?`,
      paidAfn,
      outstandingAfn,
      balance.paymentStatus,
      now,
      input.purchaseId,
      input.factoryId
    );

    await recordAuditEvent(db, {
      factoryId: input.factoryId,
      eventType: 'purchase.payment_made',
      entityType: 'purchase',
      entityId: input.purchaseId,
      details: {
        amountMinor: input.amountMinor,
        paymentCurrency: purchase.currency,
        paymentAfn,
      },
    }, now);
    await enqueueOutbox(db, {
      factoryId: input.factoryId,
      entityType: 'purchase_payment',
      entityId: paymentId,
    }, now);
    await enqueueOutbox(db, {
      factoryId: input.factoryId,
      entityType: 'cash_movement',
      entityId: cashMovementId,
    }, now);
    await enqueueOutbox(db, {
      factoryId: input.factoryId,
      entityType: 'purchase',
      entityId: input.purchaseId,
    }, now);
  });
}

export async function getPurchases(
  db: SQLiteDatabase,
  factoryId: string,
  limit: number | null = 50,
  supplierId: string | null = null,
  purchaseId: string | null = null
): Promise<Purchase[]> {
  const rows = await db.getAllAsync<PurchaseRow>(
    `SELECT p.*, s.name AS supplier_name
       FROM purchases p
       JOIN suppliers s ON s.id = p.supplier_id
      WHERE p.factory_id = ? AND p.deleted_at IS NULL
        AND (? IS NULL OR p.supplier_id = ?)
        AND (? IS NULL OR p.id = ?)
      ORDER BY p.purchase_date DESC, p.created_at DESC
      ${limit === null ? '' : 'LIMIT ?'}`,
    ...(limit === null
      ? [factoryId, supplierId, supplierId, purchaseId, purchaseId]
      : [factoryId, supplierId, supplierId, purchaseId, purchaseId, limit])
  );

  const purchases: Purchase[] = [];
  for (const row of rows) {
    const itemRows = await db.getAllAsync<PurchaseItemRow>(
      `SELECT pi.*, rm.name AS raw_material_name
         FROM purchase_items pi
         JOIN raw_materials rm ON rm.id = pi.raw_material_id
        WHERE pi.purchase_id = ? AND pi.factory_id = ?
        ORDER BY pi.created_at ASC`,
      row.id,
      factoryId
    );
    const paymentRows = await db.getAllAsync<PurchasePaymentRow>(
      `SELECT payment_currency, amount_minor, exchange_rate_milli, paid_at
         FROM purchase_payments
        WHERE purchase_id = ? AND factory_id = ?
        ORDER BY paid_at ASC, created_at ASC`,
      row.id,
      factoryId
    );
    const items: PurchaseItem[] = itemRows.map((item) => ({
      id: item.id,
      rawMaterialId: item.raw_material_id,
      rawMaterialName: item.raw_material_name,
      quantityGrams: item.quantity_grams,
      unitPriceMinor: item.unit_price_minor,
      lineTotalMinor: item.line_total_minor,
    }));
    const payments: RecordedPayment[] = paymentRows.map((payment) => ({
      currency: payment.payment_currency,
      amountMinor: payment.amount_minor,
      exchangeRateMilli: payment.exchange_rate_milli,
      paidAt: payment.paid_at,
    }));
    const paidOriginalMinor = payments.reduce(
      (total, payment) =>
        payment.currency === row.currency ? total + payment.amountMinor : total,
      0
    );
    const originalBalance = applyOriginalCurrencyPayment(
      row.total_original_minor,
      Math.min(row.total_original_minor, paidOriginalMinor),
      0
    );
    purchases.push({
      id: row.id,
      supplierId: row.supplier_id,
      supplierName: row.supplier_name,
      purchaseDate: row.purchase_date,
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
      items,
      payments,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
  return purchases;
}

export async function getPurchasesForSupplier(
  db: SQLiteDatabase,
  factoryId: string,
  supplierId: string
): Promise<Purchase[]> {
  return getPurchases(db, factoryId, null, supplierId);
}

export async function getPurchaseCashTotals(
  db: SQLiteDatabase,
  factoryId: string
): Promise<CashFlowTotals> {
  const row = await db.getFirstAsync<{ total_afn: number }>(
    `SELECT COALESCE(SUM(payment.afn_equivalent), 0) AS total_afn
       FROM purchase_payments AS payment
       JOIN purchases AS purchase
         ON purchase.id = payment.purchase_id
        AND purchase.factory_id = payment.factory_id
      WHERE payment.factory_id = ? AND purchase.deleted_at IS NULL`,
    factoryId
  );
  return { afn: row?.total_afn ?? 0 };
}

export async function getPurchase(
  db: SQLiteDatabase,
  factoryId: string,
  purchaseId: string
): Promise<Purchase | null> {
  const rows = await getPurchases(db, factoryId, null, null, purchaseId);
  return rows.find((row) => row.id === purchaseId) ?? null;
}
