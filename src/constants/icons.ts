import type { IconName } from '@/components/ui/icon';

/**
 * Every icon used in the app. Keeping the platform names together makes it
 * easy to verify that the Android Material symbol exists as well.
 */
export const Icons = {
  dashboard: { ios: 'house.fill', android: 'home' } as IconName,
  inventory: { ios: 'shippingbox.fill', android: 'inventory_2' } as IconName,
  operations: { ios: 'gearshape.2.fill', android: 'precision_manufacturing' } as IconName,
  finance: { ios: 'banknote.fill', android: 'account_balance_wallet' } as IconName,
  more: { ios: 'ellipsis', android: 'more_horiz' } as IconName,

  factory: { ios: 'building.2.fill', android: 'factory' } as IconName,
  rate: { ios: 'arrow.triangle.2.circlepath', android: 'currency_exchange' } as IconName,
  calendar: { ios: 'calendar', android: 'schedule' } as IconName,
  lock: { ios: 'lock.fill', android: 'lock' } as IconName,
  info: { ios: 'info.circle.fill', android: 'info' } as IconName,
  warning: { ios: 'exclamationmark.triangle.fill', android: 'warning' } as IconName,
  check: { ios: 'checkmark.circle.fill', android: 'check_circle' } as IconName,
  cloudOff: { ios: 'icloud.slash.fill', android: 'cloud_off' } as IconName,
  database: { ios: 'internaldrive.fill', android: 'database' } as IconName,
  person: { ios: 'person.fill', android: 'person' } as IconName,
  chart: { ios: 'chart.line.uptrend.xyaxis', android: 'trending_up' } as IconName,
  cart: { ios: 'cart.fill', android: 'shopping_cart' } as IconName,
  receipt: { ios: 'doc.text.fill', android: 'receipt_long' } as IconName,
  wallet: { ios: 'wallet.pass.fill', android: 'account_balance_wallet' } as IconName,
  chevronLeft: { ios: 'chevron.left', android: 'chevron_left' } as IconName,
  plus: { ios: 'plus', android: 'add' } as IconName,
  sync: { ios: 'arrow.clockwise', android: 'sync' } as IconName,
  globe: { ios: 'globe', android: 'language' } as IconName,
  settings: { ios: 'gearshape.fill', android: 'settings' } as IconName,
} as const;
