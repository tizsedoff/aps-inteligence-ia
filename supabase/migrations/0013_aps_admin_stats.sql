-- Resumen para administradores: cuántos usuarios tiene APS y cuánto se está usando.
-- Solo devuelve datos si quien llama es admin; nunca expone emails ni contenido, solo números.
-- Cuenta usuarios APS (aps_profiles), no los de otras apps del mismo proyecto de Supabase.
create or replace function public.aps_admin_stats()
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  adm boolean;
  gday text := to_char(now() at time zone 'America/Los_Angeles', 'YYYY-MM-DD');
  by_plan jsonb;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  select is_admin into adm from public.aps_profiles where id = uid;
  if adm is distinct from true then raise exception 'forbidden'; end if;

  select coalesce(jsonb_object_agg(plan, n), '{}'::jsonb) into by_plan
  from (select plan, count(*) as n from public.aps_profiles group by plan) t;

  return jsonb_build_object(
    'total_users', (select count(*) from public.aps_profiles),
    'new_24h', (select count(*) from public.aps_profiles where created_at >= now() - interval '24 hours'),
    'new_7d', (select count(*) from public.aps_profiles where created_at >= now() - interval '7 days'),
    'active_24h', (select count(*) from public.aps_usage where updated_at >= now() - interval '24 hours'),
    'by_plan', by_plan,
    'global_used_today', coalesce((select used from public.aps_global_usage where day = gday), 0),
    'global_cap', coalesce((select int_value from public.aps_settings where key = 'global_daily_cap'), 0)
  );
end $$;
revoke all on function public.aps_admin_stats() from public, anon;
grant execute on function public.aps_admin_stats() to authenticated;
