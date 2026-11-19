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
