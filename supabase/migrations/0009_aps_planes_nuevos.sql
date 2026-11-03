-- Planes nuevos (ids sin cambio): basic 15/día; advanced (Plus) 600/mes; pro 2000/mes; promax (Max) 5500/mes.
-- Mismos límites que src/constants/plans.ts. El resto de la lógica es igual a 0008.
do $mig$
declare
  f text;
  def text;
begin
  foreach f in array array['aps_consume_usage(integer)', 'aps_get_usage()'] loop
    def := pg_get_functiondef(('public.' || f)::regprocedure);
    def := replace(def,
      'case prof.plan when ''basic'' then 50 when ''advanced'' then 25 when ''pro'' then 50 when ''promax'' then 120 else 50 end',
      'case prof.plan when ''basic'' then 15 when ''advanced'' then 600 when ''pro'' then 2000 when ''promax'' then 5500 else 15 end');
    execute def;
  end loop;
end $mig$;
