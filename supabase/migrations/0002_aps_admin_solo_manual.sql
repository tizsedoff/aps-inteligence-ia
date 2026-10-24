-- El rol de administrador nunca se deduce del correo (con "Confirm email" desactivado
-- cualquiera podría registrarse con ese correo). Se asigna a mano:
--   update public.aps_profiles set is_admin = true where id = '<uuid del usuario>';
create or replace function public.aps_create_profile(uid uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare u auth.users%rowtype;
begin
  select * into u from auth.users where id = uid;
  if not found then return; end if;
  insert into public.aps_profiles (id, email, name, avatar, is_admin)
  values (
    u.id,
    coalesce(u.email, ''),
    left(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', split_part(coalesce(u.email, 'usuario'), '@', 1)), 80),
    left(coalesce(u.raw_user_meta_data ->> 'avatar_url', ''), 2000),
    false
  )
  on conflict (id) do nothing;
end $$;
revoke all on function public.aps_create_profile(uuid) from public, anon, authenticated;
