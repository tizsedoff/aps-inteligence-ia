-- El administrador también está sujeto al límite de su plan (así se pueden probar los límites).
-- Mantiene acceso a Hard Work y a la compra simulada por ser admin.
create or replace function public.aps_consume_usage(cost integer default 1)
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
  used integer;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if cost is null or cost < 0 or cost > 10 then raise exception 'invalid_cost'; end if;

  select * into prof from public.aps_profiles where id = uid;
  if not found then
    perform public.aps_create_profile(uid);
    select * into prof from public.aps_profiles where id = uid;
  end if;

  per := case prof.plan when 'basic' then 'day' else 'month' end;
  lim := case prof.plan when 'basic' then 200 when 'advanced' then 25 when 'pro' then 50 when 'promax' then 120 else 200 end;

  insert into public.aps_usage (user_id, month, day) values (uid, m, d) on conflict (user_id) do nothing;
  select * into u from public.aps_usage where user_id = uid for update;

  if u.month <> m then u.month := m; u.month_count := 0; end if;
  if u.day <> d then u.day := d; u.day_count := 0; end if;
  used := case per when 'day' then u.day_count else u.month_count end;

  if used + cost > lim then
    update public.aps_usage set month = u.month, month_count = u.month_count, day = u.day, day_count = u.day_count, updated_at = now() where user_id = uid;
    return jsonb_build_object('allowed', false, 'plan', prof.plan, 'is_admin', prof.is_admin, 'used', used, 'limit', lim, 'period', per);
  end if;

  update public.aps_usage
     set month = u.month, month_count = u.month_count + cost, day = u.day, day_count = u.day_count + cost, updated_at = now()
   where user_id = uid;
  return jsonb_build_object('allowed', true, 'plan', prof.plan, 'is_admin', prof.is_admin, 'used', used + cost, 'limit', lim, 'period', per);
end $$;

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
  per := case prof.plan when 'basic' then 'day' else 'month' end;
  lim := case prof.plan when 'basic' then 200 when 'advanced' then 25 when 'pro' then 50 when 'promax' then 120 else 200 end;
  select * into u from public.aps_usage where user_id = uid;
  if found then
    if per = 'day' and u.day = d then used := u.day_count; end if;
    if per = 'month' and u.month = m then used := u.month_count; end if;
  end if;
  return jsonb_build_object('plan', prof.plan, 'is_admin', prof.is_admin, 'used', used, 'limit', lim, 'period', per, 'day', d, 'month', m);
end $$;
