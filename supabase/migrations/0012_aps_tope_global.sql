-- Tope global diario de usos para toda la plataforma (protege la cuota/presupuesto de IA).
-- El día global sigue el reinicio de cuota de Google (medianoche del Pacífico), no el de Buenos Aires.
-- Se cambia con: update public.aps_settings set int_value = <n> where key = 'global_daily_cap';  (0 = sin tope)
-- Los admins no cuentan contra el tope ni son frenados por él.
-- El contador solo lo mueve aps_consume_usage, que ya limita a cada usuario: nadie puede inflarlo por su cuenta.

create table if not exists public.aps_settings (
  key text primary key,
  int_value integer not null
);
alter table public.aps_settings enable row level security;  -- sin políticas: solo funciones SECURITY DEFINER

create table if not exists public.aps_global_usage (
  day text primary key,
  used integer not null default 0
);
alter table public.aps_global_usage enable row level security;  -- sin políticas

insert into public.aps_settings (key, int_value) values ('global_daily_cap', 400)
on conflict (key) do nothing;

-- La función de usuario existente pasa a ser interna (mismo cuerpo, mismos límites por plan).
alter function public.aps_consume_usage(integer) rename to aps_consume_usage_inner;
revoke all on function public.aps_consume_usage_inner(integer) from public, anon, authenticated;

create or replace function public.aps_consume_usage(cost integer default 1)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  adm boolean;
  cap integer;
  gday text := to_char(now() at time zone 'America/Los_Angeles', 'YYYY-MM-DD');
  g integer;
  res jsonb;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if cost is null or cost < 0 or cost > 10 then raise exception 'invalid_cost'; end if;

  select is_admin into adm from public.aps_profiles where id = uid;
  select int_value into cap from public.aps_settings where key = 'global_daily_cap';

  if cost = 0 or adm is true or coalesce(cap, 0) <= 0 then
    return public.aps_consume_usage_inner(cost);
  end if;

  insert into public.aps_global_usage (day, used) values (gday, 0) on conflict (day) do nothing;
  select used into g from public.aps_global_usage where day = gday for update;

  if g + cost > cap then
    return jsonb_build_object('allowed', false, 'reason', 'capacity', 'used', 0, 'limit', null, 'period', null);
  end if;

  res := public.aps_consume_usage_inner(cost);
  if (res ->> 'allowed') = 'true' then
    update public.aps_global_usage set used = used + cost where day = gday;
  end if;
  return res;
end $$;
revoke all on function public.aps_consume_usage(integer) from public, anon;
grant execute on function public.aps_consume_usage(integer) to authenticated;
