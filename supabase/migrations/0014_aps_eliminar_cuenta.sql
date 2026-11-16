-- Eliminación de la propia cuenta (derecho de supresión, Ley 25.326).
-- Borra al usuario de auth.users; el resto (aps_profiles, aps_memories, aps_brands, aps_usage,
-- aps_subscriptions) se elimina solo por ON DELETE CASCADE.
-- Solo puede borrarse a sí mismo (auth.uid()). Los administradores quedan protegidos para
-- que no se pierda el acceso de administración por un clic.
create or replace function public.aps_delete_my_account()
returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  adm boolean;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  select is_admin into adm from public.aps_profiles where id = uid;
  if adm is true then raise exception 'admin_protected'; end if;
  delete from auth.users where id = uid;
end $$;

revoke all on function public.aps_delete_my_account() from public, anon;
grant execute on function public.aps_delete_my_account() to authenticated;
