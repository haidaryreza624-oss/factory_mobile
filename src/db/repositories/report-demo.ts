import type { SQLiteDatabase } from 'expo-sqlite';

import { fa } from '@/i18n';
import { getKabulDateISO } from '@/lib/time';

import { getFinanceCategories, postBusinessExpense } from './finance';
import { getRawMaterials, saveRawMaterial } from './inventory';
import { createFinishedProduct, postProduction } from './production';
import { getSuppliers, postPurchase, saveSupplier } from './purchases';
import { getCustomers, postSale, saveCustomer } from './sales';

const DEMO_DATE_SETTING = 'report_demo_anchor_date';

function daysBefore(date: string, days: number): string {
  const result = new Date(`${date}T00:00:00.000Z`);
  result.setUTCDate(result.getUTCDate() - days);
  return result.toISOString().slice(0, 10);
}

async function getOrCreateAnchorDate(
  db: SQLiteDatabase,
  factoryId: string
): Promise<string> {
  const existing = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE factory_id = ? AND key = ?',
    factoryId,
    DEMO_DATE_SETTING
  );
  let anchorDate = existing?.value;
  if (!anchorDate) {
    anchorDate = getKabulDateISO(new Date());
    await db.runAsync(
      `INSERT OR IGNORE INTO app_settings (factory_id, key, value, updated_at)
       VALUES (?, ?, ?, ?)`,
      factoryId,
      DEMO_DATE_SETTING,
      anchorDate,
      new Date().toISOString()
    );
    const saved = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM app_settings WHERE factory_id = ? AND key = ?',
      factoryId,
      DEMO_DATE_SETTING
    );
    anchorDate = saved?.value;
  }
  if (!anchorDate || !/^\d{4}-\d{2}-\d{2}$/.test(anchorDate)) {
    throw new Error('تاریخ نمونه‌سازی گزارش‌ها معتبر نیست.');
  }
  return anchorDate;
}

export async function seedReportDemoData(
  db: SQLiteDatabase,
  factoryId: string
): Promise<{ createdCount: number }> {
  const anchorDate = await getOrCreateAnchorDate(db, factoryId);
  const firstDate = daysBefore(anchorDate, 5);
  const firstEventAt = `${firstDate}T08:00:00.000Z`;

  const suppliers = await getSuppliers(db, factoryId);
  const supplier =
    suppliers.find((item) => item.name === fa.reports.demoSupplierName) ??
    await saveSupplier(db, {
      factoryId,
      name: fa.reports.demoSupplierName,
      notes: fa.reports.sampleDataLabel,
      now: firstEventAt,
    });

  const customers = await getCustomers(db, factoryId);
  const customer =
    customers.find((item) => item.name === fa.reports.demoCustomerName) ??
    await saveCustomer(db, {
      factoryId,
      name: fa.reports.demoCustomerName,
      notes: fa.reports.sampleDataLabel,
      now: firstEventAt,
    });

  const rawMaterials = await getRawMaterials(db, factoryId);
  const material =
    rawMaterials.find((item) => item.name === fa.reports.demoMaterialName) ??
    await saveRawMaterial(db, {
      factoryId,
      name: fa.reports.demoMaterialName,
      minimumStockGrams: 0,
      expectedYieldMilli: 900,
      now: firstEventAt,
    });

  const finishedProductId = await createFinishedProduct(
    db,
    factoryId,
    fa.reports.demoProductName,
    firstEventAt
  );
  const categories = await getFinanceCategories(db, factoryId, 'business');
  const expenseCategory = categories[0];
  if (!expenseCategory) throw new Error('دسته‌بندی مصرف برای نمونه‌سازی پیدا نشد.');

  let createdCount = 0;
  for (let daysAgo = 5; daysAgo >= 1; daysAgo -= 1) {
    const date = daysBefore(anchorDate, daysAgo);
    const eventAt = `${date}T08:00:00.000Z`;
    const purchaseReference = `RPT-DEMO-P-${date}`;
    const saleReference = `RPT-DEMO-S-${date}`;
    const productionNotes = `RPT-DEMO-PR-${date}`;
    const expenseDescription = `${fa.reports.sampleDataLabel} - ${date}`;

    const existingPurchase = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM purchases
        WHERE factory_id = ? AND reference = ? AND deleted_at IS NULL`,
      factoryId,
      purchaseReference
    );
    if (!existingPurchase) {
      await postPurchase(db, {
        factoryId,
        supplierId: supplier.id,
        purchaseDate: date,
        currency: 'AFN',
        items: [{
          rawMaterialId: material.id,
          quantityGrams: 2000,
          unitPriceMinor: 2500,
        }],
        paidMinor: 1000,
        reference: purchaseReference,
        notes: fa.reports.sampleDataLabel,
        now: eventAt,
      });
      createdCount += 1;
    }

    const existingProduction = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM production_batches
        WHERE factory_id = ? AND production_date = ? AND notes = ?
          AND deleted_at IS NULL`,
      factoryId,
      date,
      productionNotes
    );
    if (!existingProduction) {
      await postProduction(db, {
        factoryId,
        productionDate: date,
        finishedProductId,
        actualOutputGrams: 1800,
        inputs: [{ rawMaterialId: material.id, quantityGrams: 2000 }],
        notes: productionNotes,
        now: eventAt,
      });
      createdCount += 1;
    }

    const existingSale = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM sales
        WHERE factory_id = ? AND reference = ? AND deleted_at IS NULL`,
      factoryId,
      saleReference
    );
    if (!existingSale) {
      await postSale(db, {
        factoryId,
        customerId: customer.id,
        finishedProductId,
        saleDate: date,
        currency: 'AFN',
        quantityGrams: 1300,
        unitPriceMinor: 8000,
        paidMinor: 3000,
        reference: saleReference,
        notes: fa.reports.sampleDataLabel,
        now: eventAt,
      });
      createdCount += 1;
    }

    const existingExpense = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM business_expenses
        WHERE factory_id = ? AND expense_date = ? AND description = ?
          AND deleted_at IS NULL`,
      factoryId,
      date,
      expenseDescription
    );
    if (!existingExpense) {
      await postBusinessExpense(db, {
        factoryId,
        categoryId: expenseCategory.id,
        expenseDate: date,
        amountAfn: 2000,
        description: expenseDescription,
        now: eventAt,
      });
      createdCount += 1;
    }
  }

  return { createdCount };
}
