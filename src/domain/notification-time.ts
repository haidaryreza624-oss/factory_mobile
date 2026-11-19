import { toAsciiDigits } from '@/lib/persian';

export interface NotificationTime {
  hour: number;
  minute: number;
}

export function parseNotificationTime(value: string): NotificationTime | null {
  const normalized = toAsciiDigits(value.trim());
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(normalized);
  if (!match) return null;

  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
  };
}
