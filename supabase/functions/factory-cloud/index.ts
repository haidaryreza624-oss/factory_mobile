import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const MAX_SNAPSHOT_BYTES = 1_500_000;

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('');
}

async function passwordsMatch(supplied: string, configured: string): Promise<boolean> {
  const [suppliedHash, configuredHash] = await Promise.all([
    sha256(supplied),
    sha256(configured),
  ]);
  let difference = 0;
  for (let index = 0; index < suppliedHash.length; index += 1) {
    difference |= suppliedHash.charCodeAt(index) ^ configuredHash.charCodeAt(index);
  }
  return difference === 0;
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return response({ error: 'method_not_allowed' }, 405);

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_SNAPSHOT_BYTES) {
    return response({ error: 'snapshot_too_large' }, 413);
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody) as unknown;
  } catch {
    return response({ error: 'invalid_json' }, 400);
  }
  if (
    typeof parsedBody !== 'object' ||
    parsedBody === null ||
    Array.isArray(parsedBody)
  ) {
    return response({ error: 'invalid_request' }, 400);
  }
  const body = parsedBody as Record<string, unknown>;

  const action = body.action;
  if (typeof action !== 'string') {
    return response({ error: 'invalid_request' }, 400);
  }

  const projectUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = getServiceRoleKey();
  if (!projectUrl || !serviceRoleKey) {
    return response({ error: 'server_not_configured' }, 500);
  }

  const admin = createClient(projectUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (action === 'authorize_reset' || action === 'reset') {
    const adminPassword = body.adminPassword;
    const configuredPassword = Deno.env.get('FACTORY_ADMIN_RESET_PASSWORD');
    if (!configuredPassword) {
      return response({ error: 'admin_reset_not_configured' }, 500);
    }
    if (
      typeof adminPassword !== 'string' ||
      adminPassword.length === 0 ||
      adminPassword.length > 256
    ) {
      return response({ error: 'invalid_request' }, 400);
    }
    if (!(await allowRecoveryAttempt(admin, request))) {
      return response({ error: 'too_many_attempts' }, 429);
    }
    if (!(await passwordsMatch(adminPassword, configuredPassword))) {
      return response({ error: 'invalid_admin_password' }, 401);
    }
    if (action === 'authorize_reset') return response({ authorized: true });

    const { error } = await admin.rpc('truncate_factory_cloud_data');
    if (error) return response({ error: 'admin_reset_failed' }, 500);
    return response({ reset: true });
  }

  const recoveryCode = body.recoveryCode;
  if (typeof recoveryCode !== 'string') {
    return response({ error: 'invalid_request' }, 400);
  }
  const normalizedCode = recoveryCode.replace(/[\s-]/g, '').toUpperCase();
  if (!/^[0-9A-F]{32}$/.test(normalizedCode)) {
    return response({ error: 'invalid_recovery_code' }, 400);
  }

  const recoveryCodeHash = await sha256(normalizedCode);

  if (action === 'restore') {
    const allowed = await allowRecoveryAttempt(admin, request);
    if (!allowed) return response({ error: 'too_many_attempts' }, 429);

    const { data, error } = await admin
      .from('factory_cloud_backups')
      .select('factory_id, snapshot, revision, updated_at')
      .eq('recovery_code_hash', recoveryCodeHash)
      .maybeSingle();
    if (error) return response({ error: 'restore_failed' }, 500);
    if (!data) return response({ error: 'recovery_code_not_found' }, 404);
    return response({
      factoryId: data.factory_id,
      snapshot: data.snapshot,
      revision: data.revision,
      updatedAt: data.updated_at,
    });
  }

  if (action === 'register') {
    const factoryId = body.factoryId;
    const snapshot = body.snapshot;
    if (
      typeof factoryId !== 'string' ||
      !isUuid(factoryId) ||
      !isValidSnapshot(snapshot, factoryId)
    ) {
      return response({ error: 'invalid_snapshot' }, 400);
    }

    if (!(await allowRecoveryAttempt(admin, request))) {
      return response({ error: 'too_many_attempts' }, 429);
    }

    const { data: existing, error: lookupError } = await admin
      .from('factory_cloud_backups')
      .select('factory_id, recovery_code_hash, revision, updated_at')
      .eq('factory_id', factoryId)
      .maybeSingle();
    if (lookupError) return response({ error: 'registration_failed' }, 500);
    if (existing) {
      if (existing.recovery_code_hash !== recoveryCodeHash) {
        return response({ error: 'factory_already_registered' }, 409);
      }
      return response({
        factoryId,
        revision: existing.revision,
        updatedAt: existing.updated_at,
      });
    }

    const { data, error } = await admin
      .from('factory_cloud_backups')
      .insert({
        factory_id: factoryId,
        recovery_code_hash: recoveryCodeHash,
        snapshot,
        revision: 1,
      })
      .select('factory_id, revision, updated_at')
      .single();
    if (error?.code === '23505') {
      return response({ error: 'factory_already_registered' }, 409);
    }
    if (error) return response({ error: 'registration_failed' }, 500);
    return response({
      factoryId: data.factory_id,
      revision: data.revision,
      updatedAt: data.updated_at,
    });
  }

  if (action === 'sync') {
    const factoryId = body.factoryId;
    const snapshot = body.snapshot;
    const baseRevision = body.baseRevision;
    if (
      typeof factoryId !== 'string' ||
      !isUuid(factoryId) ||
      !isValidSnapshot(snapshot, factoryId) ||
      !Number.isSafeInteger(baseRevision) ||
      (baseRevision as number) < 1
    ) {
      return response({ error: 'invalid_sync_request' }, 400);
    }

    const { data: existing, error: lookupError } = await admin
      .from('factory_cloud_backups')
      .select('revision')
      .eq('factory_id', factoryId)
      .eq('recovery_code_hash', recoveryCodeHash)
      .maybeSingle();
    if (lookupError) return response({ error: 'sync_failed' }, 500);
    if (!existing) return response({ error: 'backup_not_registered' }, 404);
    if (existing.revision !== baseRevision) {
      return response({ error: 'revision_conflict', revision: existing.revision }, 409);
    }

    const nextRevision = existing.revision + 1;
    const { data, error } = await admin
      .from('factory_cloud_backups')
      .update({ snapshot, revision: nextRevision, updated_at: new Date().toISOString() })
      .eq('factory_id', factoryId)
      .eq('recovery_code_hash', recoveryCodeHash)
      .eq('revision', baseRevision)
      .select('factory_id, revision, updated_at')
      .maybeSingle();
    if (error) return response({ error: 'sync_failed' }, 500);
    if (!data) return response({ error: 'revision_conflict' }, 409);

    return response({
      factoryId: data.factory_id,
      revision: data.revision,
      updatedAt: data.updated_at,
    });
  }

  return response({ error: 'unsupported_action' }, 400);
});

async function allowRecoveryAttempt(
  admin: ReturnType<typeof createClient>,
  request: Request
): Promise<boolean> {
  const forwardedFor =
    request.headers.get('cf-connecting-ip')?.trim() ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown';
  const attemptKey = await sha256(`factory-recovery:${forwardedFor}`);
  const { data, error } = await admin.rpc('consume_factory_recovery_attempt', {
    p_attempt_key: attemptKey,
    p_now: new Date().toISOString(),
  });
  if (error) throw new Error('rate_limit_check_failed');
  return data === true;
}

function isValidSnapshot(value: unknown, factoryId: string): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const snapshot = value as Record<string, unknown>;
  return (
    snapshot.factoryId === factoryId &&
    Number.isSafeInteger(snapshot.schemaVersion) &&
    typeof snapshot.capturedAt === 'string' &&
    typeof snapshot.tables === 'object' &&
    snapshot.tables !== null &&
    !Array.isArray(snapshot.tables)
  );
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function getServiceRoleKey(): string | undefined {
  const legacyKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legacyKey) return legacyKey;

  const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (!secretKeys) return undefined;
  try {
    const parsed: unknown = JSON.parse(secretKeys);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'default' in parsed &&
      typeof parsed.default === 'string'
    ) {
      return parsed.default;
    }
    return undefined;
  } catch {
    return undefined;
  }
}
