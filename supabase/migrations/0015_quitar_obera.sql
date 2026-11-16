-- Obera en Oferta se dio de baja: se elimina todo lo suyo de este proyecto de Supabase.
-- APS Intelligence comparte el proyecto y NO se toca: aps_* y el trigger aps_on_auth_user_created siguen.
-- (El bucket de logos 'obera-en-oferta-logos' no se puede borrar por SQL: Supabase exige la API/panel.)

-- 1) Trigger de alta de Obera sobre auth.users (el de APS queda).
drop trigger if exists on_auth_user_created on auth.users;

-- 2) Tablas de Obera (con sus políticas e índices).
drop table if exists public.promo_usos cascade;
drop table if exists public.cupones_canjeados cascade;
drop table if exists public.comentarios cascade;
drop table if exists public.ofertas cascade;
drop table if exists public.promociones cascade;
drop table if exists public.solicitudes_plan cascade;
drop table if exists public.pagos cascade;
drop table if exists public.suscripciones cascade;
drop table if exists public.negocios cascade;
drop table if exists public.planes cascade;
drop table if exists public.admins cascade;
drop table if exists public.profiles cascade;

-- 3) Funciones de Obera.
drop function if exists public.activar_suscripcion(uuid);
drop function if exists public.aplicar_cobro_suscripcion(uuid, text);
drop function if exists public.aplicar_pago_aprobado(uuid, text, text);
drop function if exists public.asignar_plan_manual(uuid, text, integer, text, numeric);
drop function if exists public.calcular_precio(uuid, text);
drop function if exists public.es_dueno_de_negocio(uuid);
drop function if exists public.handle_new_user();
drop function if exists public.is_admin();
drop function if exists public.is_panel_admin();
drop function if exists public.is_superadmin();
drop function if exists public.listar_negocios_admin();
drop function if exists public.precios_negocio(uuid);
drop function if exists public.set_ofertas_extra(uuid, integer);

-- 4) Usuarios que eran solo de Obera (sin perfil de APS). Confirmado por el dueño.
delete from auth.users u
where u.id in (
  '60b011c1-4817-40ee-a273-2d766e302293',
  'afcaadef-c6df-4957-9cce-3bbdd92063e4',
  '062adda8-030e-4cbd-99ce-e11731e720ff'
)
and not exists (select 1 from public.aps_profiles p where p.id = u.id);
