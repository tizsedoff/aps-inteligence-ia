-- Suscripciones pagas. Solo el servidor (service_role) las escribe: el usuario únicamente puede LEER las suyas.
create table if not exists public.aps_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null check (plan in ('advanced', 'pro', 'promax')),
  status text not null check (status in ('pending', 'authorized', 'paused', 'cancelled')),
  provider text not null default 'mercadopago',
  provider_subscription_id text not null,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_subscription_id)
);
create index if not exists aps_subscriptions_user_idx on public.aps_subscriptions (user_id);

alter table public.aps_subscriptions enable row level security;
revoke all on public.aps_subscriptions from anon, authenticated;
grant select on public.aps_subscriptions to authenticated;
create policy "aps suscripcion: leer la propia" on public.aps_subscriptions
  for select to authenticated using (user_id = (select auth.uid()));

-- Aplica el estado de una suscripción y mueve el plan del perfil. Solo la puede llamar el servidor.
create or replace function public.aps_apply_subscription(
  p_user uuid, p_plan text, p_status text, p_provider_id text, p_period_end timestamptz
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  cur_plan text;
begin
  if p_plan not in ('advanced', 'pro', 'promax') then raise exception 'invalid_plan'; end if;
  if p_status not in ('pending', 'authorized', 'paused', 'cancelled') then raise exception 'invalid_status'; end if;

  insert into public.aps_subscriptions (user_id, plan, status, provider_subscription_id, current_period_end)
  values (p_user, p_plan, p_status, p_provider_id, p_period_end)
  on conflict (provider, provider_subscription_id)
  do update set status = excluded.status, current_period_end = excluded.current_period_end, updated_at = now();

  select plan into cur_plan from public.aps_profiles where id = p_user;
  if p_status = 'authorized' then
    update public.aps_profiles set plan = p_plan where id = p_user;
  elsif p_status in ('cancelled', 'paused') and cur_plan = p_plan then
    -- Solo baja si el plan actual es el de esta suscripción (no pisa otra más nueva).
    update public.aps_profiles set plan = 'basic' where id = p_user;
  end if;
  return p_status;
end $$;
revoke all on function public.aps_apply_subscription(uuid, text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.aps_apply_subscription(uuid, text, text, text, timestamptz) to service_role;
