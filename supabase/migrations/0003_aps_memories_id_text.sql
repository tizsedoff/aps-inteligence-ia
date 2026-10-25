-- La app ya genera ids de texto para las memorias; se acepta texto en lugar de uuid.
alter table public.aps_memories alter column id drop default;
alter table public.aps_memories alter column id type text using id::text;
alter table public.aps_memories alter column id set default gen_random_uuid()::text;
