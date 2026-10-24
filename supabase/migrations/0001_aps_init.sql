-- APS Intelligence — esquema inicial.
-- Convive con otras apps en el mismo proyecto de Supabase: todo lleva prefijo aps_
-- y no toca tablas ajenas (p. ej. public.profiles de Obera en Oferta).
-- Principio: el cliente solo lee lo suyo y edita campos de perfil.
-- Plan, rol de administrador y uso los escribe únicamente el servidor (service role).

-- ── Perfiles ────────────────────────────────────────────────────────────────
create table public.aps_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null default 'Usuario' check (char_length(name) <= 80),
  avatar text not null default '' check (char_length(avatar) <= 300000),
  plan text not null default 'basic' check (plan in ('basic', 'advanced', 'pro', 'promax')),
  is_admin boolean not null default false,
  custom_instructions text not null default '' check (char_length(custom_instructions) <= 4000),
  created_at timestamptz not null default now()
);
alter table public.aps_profiles enable row level security;

create policy "aps perfil: leer el propio" on public.aps_profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "aps perfil: editar el propio" on public.aps_profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- RLS no restringe columnas: se revoca todo y se concede solo lo editable.
revoke all on public.aps_profiles from anon, authenticated;
grant select on public.aps_profiles to authenticated;
grant update (name, avatar, custom_instructions) on public.aps_profiles to authenticated;

-- Crea el perfil APS. Administrador: solo con correo verificado por el proveedor.
create function public.aps_create_profile(uid uuid) returns void
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
    lower(coalesce(u.email, '')) = 'tizsedoff@gmail.com' and u.email_confirmed_at is not null
  )
  on conflict (id) do nothing;
end $$;
revoke all on function public.aps_create_profile(uuid) from public, anon, authenticated;

create function public.aps_handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.aps_create_profile(new.id);
  return new;
end $$;
revoke all on function public.aps_handle_new_user() from public, anon, authenticated;
create trigger aps_on_auth_user_created after insert on auth.users
  for each row execute function public.aps_handle_new_user();

-- Para cuentas que ya existían en el proyecto antes de APS: crea su perfil al entrar.
create function public.aps_ensure_profile() returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.aps_create_profile((select auth.uid()));
end $$;
revoke all on function public.aps_ensure_profile() from public, anon;
grant execute on function public.aps_ensure_profile() to authenticated;

-- ── Memorias de la IA (solo espacio PERSONAL) ───────────────────────────────
create table public.aps_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  fact text not null check (char_length(fact) between 1 and 500),
  category text not null default 'general' check (category in ('preference', 'personal', 'project', 'general')),
  source text not null default 'user' check (source in ('user', 'auto')),
  created_at timestamptz not null default now()
);
create index aps_memories_user_idx on public.aps_memories (user_id, created_at desc);
alter table public.aps_memories enable row level security;
create policy "aps memorias: todo sobre las propias" on public.aps_memories
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.aps_memories from anon;

-- ── Marca (espacio MARCA, aislado de PERSONAL) ──────────────────────────────
create table public.aps_brands (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null check (pg_column_size(data) < 400000),
  updated_at timestamptz not null default now()
);
alter table public.aps_brands enable row level security;
create policy "aps marca: todo sobre la propia" on public.aps_brands
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.aps_brands from anon;

-- ── Uso: lo escribe solo el servidor; el usuario solo lo lee ────────────────
create table public.aps_usage (
  user_id uuid primary key references auth.users (id) on delete cascade,
  month text not null,
  month_count integer not null default 0,
  day text not null,
  day_count integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.aps_usage enable row level security;
create policy "aps uso: leer el propio" on public.aps_usage
  for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.aps_usage from anon, authenticated;
grant select on public.aps_usage to authenticated;
