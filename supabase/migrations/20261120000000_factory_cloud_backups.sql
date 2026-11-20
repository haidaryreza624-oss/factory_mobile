create table if not exists public.factory_cloud_backups (
  factory_id uuid primary key,
  recovery_code_hash text not null unique,
  snapshot jsonb not null,
  revision bigint not null check (revision > 0),
  updated_at timestamptz not null default now()
);

alter table public.factory_cloud_backups enable row level security;
revoke all on public.factory_cloud_backups from public, anon, authenticated;
grant all on public.factory_cloud_backups to service_role;

create table if not exists public.factory_recovery_attempts (
  attempt_key text primary key,
  window_started_at timestamptz not null,
  attempts integer not null check (attempts > 0)
);

alter table public.factory_recovery_attempts enable row level security;
revoke all on public.factory_recovery_attempts from public, anon, authenticated;
grant all on public.factory_recovery_attempts to service_role;

create or replace function public.consume_factory_recovery_attempt(
  p_attempt_key text,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_attempts integer;
begin
  insert into public.factory_recovery_attempts (attempt_key, window_started_at, attempts)
  values (p_attempt_key, p_now, 1)
  on conflict (attempt_key) do update
    set attempts = case
      when public.factory_recovery_attempts.window_started_at < p_now - interval '10 minutes'
        then 1
      else public.factory_recovery_attempts.attempts + 1
    end,
    window_started_at = case
      when public.factory_recovery_attempts.window_started_at < p_now - interval '10 minutes'
        then p_now
      else public.factory_recovery_attempts.window_started_at
    end
  returning attempts into current_attempts;

  return current_attempts <= 10;
end;
$$;

revoke all on function public.consume_factory_recovery_attempt(text, timestamptz) from public, anon, authenticated;
grant execute on function public.consume_factory_recovery_attempt(text, timestamptz) to service_role;
