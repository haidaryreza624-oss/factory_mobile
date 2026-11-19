import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import { afnEquivalent, type Currency } from '@/domain/money';
import { calculatePaymentStatus, calculatePurchaseLineMinor } from '@/domain/purchases';
import { toUtcIso } from '@/lib/time';

import { recordAuditEvent } from './audit';
import { enqueueOutbox } from './outbox';
import { getLatestRate } from './rates';
import type { Purchase, PurchaseItem, Supplier } from '../types';

export interface SaveSupplierInput {
  factoryId: string;
  id?: string;
  name: string;
  phone?: string;
  address?: string;
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
  paymentCurrency: Currency;
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

function mapSupplier(row: SupplierRow): Supplier {
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
        `INSERT INTO suppliers
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
      const todayRate = await getLatestRate(db, input.factoryId);
      if (!todayRate) throw new Error('برای خرید دالر ابتدا نرخ روز را ثبت کنید.');
      purchaseRateMilli = todayRate.rateMilli;
    }

    let paymentRateMilli: number | null = null;
    if (input.paymentCurrency === 'USD') {
      const todayRate = await getLatestRate(db, input.factoryId);
      if (!todayRate) throw new Error('برای پرداخت به دالر ابتدا نرخ روز را ثبت کنید.');
      paymentRateMilli = todayRate.rateMilli;
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
      : afnEquivalent(input.paymentCurrency, input.paidMinor, paymentRateMilli ?? 1000);
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
      if (!account) throw new Error('حساب نقدی برای پرداخت پیدا نشد.');

      const movementId = randomUUID();
      await db.runAsync(
        `INSERT INTO cash_movements
           (id, factory_id, account_id, currency, amount_minor, source_type,
            source_id, occurred_at, memo, created_at)
         VALUES (?, ?, ?, ?, ?, 'purchase_payment', ?, ?, 'پرداخت خرید', ?)`,
        movementId,
        input.factoryId,
        account.id,
        input.paymentCurrency,
        -input.paidMinor,
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

export async function getPurchases(
  db: SQLiteDatabase,
  factoryId: string,
  limit = 50
): Promise<Purchase[]> {
  const rows = await db.getAllAsync<PurchaseRow>(
    `SELECT p.*, s.name AS supplier_name
       FROM purchases p
       JOIN suppliers s ON s.id = p.supplier_id
      WHERE p.factory_id = ? AND p.deleted_at IS NULL
      ORDER BY p.purchase_date DESC, p.created_at DESC
      LIMIT ?`,
    factoryId,
    limit
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
    const items: PurchaseItem[] = itemRows.map((item) => ({
      id: item.id,
      rawMaterialId: item.raw_material_id,
      rawMaterialName: item.raw_material_name,
      quantityGrams: item.quantity_grams,
      unitPriceMinor: item.unit_price_minor,
      lineTotalMinor: item.line_total_minor,
    }));
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
      paymentStatus: row.payment_status,
      reference: row.reference,
      notes: row.notes,
      items,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
  return purchases;
}

export async function getPurchase(
  db: SQLiteDatabase,
  factoryId: string,
  purchaseId: string
): Promise<Purchase | null> {
  const rows = await getPurchases(db, factoryId, 1000);
  return rows.find((row) => row.id === purchaseId) ?? null;
}
