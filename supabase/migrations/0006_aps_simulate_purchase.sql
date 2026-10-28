-- Compra SIMULADA de plan: solo administradores, solo sobre su propia cuenta, sin cobro.
-- Sirve para probar planes y pantallas. Un usuario común no puede cambiar su plan por ningún camino.
create or replace function public.aps_simulate_purchase(p_plan text)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  adm boolean;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if p_plan is null or p_plan not in ('basic', 'advanced', 'pro', 'promax') then raise exception 'invalid_plan'; end if;
  select is_admin into adm from public.aps_profiles where id = uid;
  if adm is distinct from true then raise exception 'forbidden'; end if;
  update public.aps_profiles set plan = p_plan where id = uid;
  return p_plan;
end $$;
revoke all on function public.aps_simulate_purchase(text) from public, anon;
grant execute on function public.aps_simulate_purchase(text) to authenticated;
