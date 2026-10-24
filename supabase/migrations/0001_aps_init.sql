-- APS Intelligence — esquema inicial (proyecto nuevo y vacío).
-- Principio: el cliente solo puede leer lo suyo y editar campos de perfil.
-- Plan, rol de administrador y uso los escribe únicamente el servidor (service role).

-- ── Perfiles ────────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null default 'Usuario' check (char_length(name) <= 80),
  avatar text not null default '' check (char_length(avatar) <= 300000),
  plan text not null default 'basic' check (plan in ('basic', 'advanced', 'pro', 'promax')),
  is_admin boolean not null default false,
  custom_instructions text not null default '' check (char_length(custom_instructions) <= 4000),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "perfil: leer el propio" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "perfil: editar el propio" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- RLS no restringe columnas: se revoca todo y se concede solo lo editable.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (name, avatar, custom_instructions) on public.profiles to authenticated;

-- Crea el perfil al registrarse. Administrador: solo correo verificado por el proveedor.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, name, avatar, is_admin)
  values (
    new.id,
    coalesce(new.email, ''),
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, 'usuario'), '@', 1)), 80),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', ''),
    lower(coalesce(new.email, '')) = 'tizsedoff@gmail.com' and new.email_confirmed_at is not null
  );
  return new;
end $$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Memorias de la IA (solo espacio PERSONAL) ───────────────────────────────
create table public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  fact text not null check (char_length(fact) between 1 and 500),
  category text not null default 'general' check (category in ('preference', 'personal', 'project', 'general')),
  source text not null default 'user' check (source in ('user', 'auto')),
  created_at timestamptz not null default now()
);
create index memories_user_idx on public.memories (user_id, created_at desc);
alter table public.memories enable row level security;
create policy "memorias: todo sobre las propias" on public.memories
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ── Marca (espacio MARCA, aislado de PERSONAL) ──────────────────────────────
create table public.brands (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null check (pg_column_size(data) < 400000),
  updated_at timestamptz not null default now()
);
alter table public.brands enable row level security;
create policy "marca: todo sobre la propia" on public.brands
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ── Uso: lo escribe solo el servidor; el usuario solo lo lee ────────────────
create table public.usage (
  user_id uuid primary key references auth.users (id) on delete cascade,
  month text not null,
  month_count integer not null default 0,
  day text not null,
  day_count integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.usage enable row level security;
create policy "uso: leer el propio" on public.usage
  for select to authenticated using (user_id = (select auth.uid()));
revoke insert, update, delete on public.usage from anon, authenticated;
