import { describe, expect, it } from 'vitest';

import { parseNotificationTime } from '../notification-time';

describe('parseNotificationTime', () => {
  it('accepts 24-hour times using ASCII or Persian digits', () => {
    expect(parseNotificationTime('06:30')).toEqual({ hour: 6, minute: 30 });
    expect(parseNotificationTime('6:05')).toEqual({ hour: 6, minute: 5 });
    expect(parseNotificationTime('۱۶:۰۰')).toEqual({ hour: 16, minute: 0 });
  });

  it('rejects invalid time values', () => {
    expect(parseNotificationTime('24:00')).toBeNull();
    expect(parseNotificationTime('12:60')).toBeNull();
    expect(parseNotificationTime('abc')).toBeNull();
    expect(parseNotificationTime('')).toBeNull();
  });
});
