import type { Currency } from '@/domain/money';

export interface FactoryRow {
  id: string;
  name: string;
  owner_name: string | null;
  reporting_currency: Currency;
  timezone: string;
  locale: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ExchangeRateRow {
  id: string;
  factory_id: string;
  rate_milli: number;
  effective_date: string;
  entered_at: string;
  created_at: string;
  updated_at: string;
}

export interface Factory {
  id: string;
  name: string;
  ownerName: string | null;
  reportingCurrency: Currency;
  timezone: string;
  locale: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExchangeRate {
  id: string;
  rateMilli: number;
  effectiveDate: string;
  enteredAt: string;
  updatedAt: string;
}

export interface DashboardSnapshot {
  factory: Factory;
  /** Whole AFN. */
  afnBalance: number;
  /** USD cents. */
  usdBalance: number;
  latestRate: ExchangeRate | null;
  todayRate: ExchangeRate | null;
  todayDate: string;
  pendingSyncCount: number;
}

export interface RawMaterialRow {
  id: string;
  factory_id: string;
  name: string;
  description: string | null;
  unit: string;
  minimum_stock_grams: number;
  expected_yield_milli: number;
  is_active: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface RawMaterial {
  id: string;
  factoryId: string;
  name: string;
  description: string | null;
  unit: 'KG';
  minimumStockGrams: number;
  expectedYieldMilli: number;
  isActive: boolean;
  currentStockGrams: number;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovementRow {
  id: string;
  factory_id: string;
  stock_type: 'raw_material' | 'finished_product';
  stock_item_id: string;
  quantity_grams: number;
  resulting_balance_grams: number;
  movement_type: string;
  source_type: string | null;
  source_id: string | null;
  memo: string | null;
  occurred_at: string;
  created_at: string;
}

export interface StockMovement {
  id: string;
  stockType: 'raw_material' | 'finished_product';
  stockItemId: string;
  quantityGrams: number;
  resultingBalanceGrams: number;
  movementType: string;
  sourceType: string | null;
  sourceId: string | null;
  memo: string | null;
  occurredAt: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  factoryId: string;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseItem {
  id: string;
  rawMaterialId: string;
  rawMaterialName: string;
  quantityGrams: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
}

export interface Purchase {
  id: string;
  supplierId: string;
  supplierName: string;
  purchaseDate: string;
  currency: Currency;
  totalOriginalMinor: number;
  totalAfn: number;
  exchangeRateMilli: number | null;
  paidAfn: number;
  outstandingAfn: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  reference: string | null;
  notes: string | null;
  items: PurchaseItem[];
  createdAt: string;
  updatedAt: string;
}

export function mapFactory(row: FactoryRow): Factory {
  return {
    id: row.id,
    name: row.name,
    ownerName: row.owner_name,
    reportingCurrency: row.reporting_currency,
    timezone: row.timezone,
    locale: row.locale,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapExchangeRate(row: ExchangeRateRow): ExchangeRate {
  return {
    id: row.id,
    rateMilli: row.rate_milli,
    effectiveDate: row.effective_date,
    enteredAt: row.entered_at,
    updatedAt: row.updated_at,
  };
}
