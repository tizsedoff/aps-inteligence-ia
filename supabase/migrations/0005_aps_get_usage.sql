-- Lectura (sin descontar) del uso del usuario autenticado, para mostrar el contador real en la app.
-- Misma lógica de período y límites que aps_consume_usage.
create or replace function public.aps_get_usage()
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  prof public.aps_profiles%rowtype;
  per text;
  lim integer;
  tz text := 'America/Argentina/Buenos_Aires';
  d text := to_char(now() at time zone tz, 'YYYY-MM-DD');
  m text := to_char(now() at time zone tz, 'YYYY-MM');
  u public.aps_usage%rowtype;
  used integer := 0;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  select * into prof from public.aps_profiles where id = uid;
  if not found then
    perform public.aps_create_profile(uid);
    select * into prof from public.aps_profiles where id = uid;
  end if;
  if prof.is_admin then
    return jsonb_build_object('plan', prof.plan, 'is_admin', true, 'used', 0, 'limit', null, 'period', null);
  end if;
  per := case prof.plan when 'basic' then 'day' else 'month' end;
  lim := case prof.plan when 'basic' then 200 when 'advanced' then 25 when 'pro' then 50 when 'promax' then 120 else 200 end;
  select * into u from public.aps_usage where user_id = uid;
  if found then
    if per = 'day' and u.day = d then used := u.day_count; end if;
    if per = 'month' and u.month = m then used := u.month_count; end if;
  end if;
  return jsonb_build_object('plan', prof.plan, 'is_admin', false, 'used', used, 'limit', lim, 'period', per, 'day', d, 'month', m);
end $$;
revoke all on function public.aps_get_usage() from public, anon;
grant execute on function public.aps_get_usage() to authenticated;
