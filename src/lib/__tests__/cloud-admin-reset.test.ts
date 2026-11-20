import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  authorizeAdminReset,
  CloudBackupError,
  resetCloudBackupData,
} from '@/lib/cloud-client';

vi.mock('expo-secure-store', () => ({
  deleteItemAsync: vi.fn(),
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
}));
vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

const originalProjectUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const originalPublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

describe('cloud admin reset requests', () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://project.example';
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    restoreEnvironmentValue('EXPO_PUBLIC_SUPABASE_URL', originalProjectUrl);
    restoreEnvironmentValue(
      'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      originalPublishableKey
    );
  });

  it('uses the password verification action for local resets', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ authorized: true }), { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);

    await authorizeAdminReset('test-admin-password');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://project.example/functions/v1/factory-cloud',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          action: 'authorize_reset',
          adminPassword: 'test-admin-password',
        }),
      })
    );
  });

  it('only accepts a successful cloud reset response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ reset: true }), { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(resetCloudBackupData('test-admin-password')).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      'https://project.example/functions/v1/factory-cloud',
      expect.objectContaining({
        body: JSON.stringify({
          action: 'reset',
          adminPassword: 'test-admin-password',
        }),
      })
    );
  });

  it('surfaces a rejected admin password', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'invalid_admin_password' }), { status: 401 })
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(authorizeAdminReset('wrong-password')).rejects.toMatchObject({
      code: 'invalid_admin_password',
    } satisfies Partial<CloudBackupError>);
  });
});

function restoreEnvironmentValue(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
