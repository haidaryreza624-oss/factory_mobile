create or replace function public.truncate_factory_cloud_data()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  truncate table
    public.factory_cloud_backups,
    public.factory_recovery_attempts;
end;
$$;

revoke all on function public.truncate_factory_cloud_data() from public, anon, authenticated;
grant execute on function public.truncate_factory_cloud_data() to service_role;
