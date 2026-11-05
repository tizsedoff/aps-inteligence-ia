-- Límites: basic 15/día; advanced (Plus) 600/mes; pro 1200/mes; promax (Max) 4000/mes.
-- Mismos valores que src/constants/plans.ts.
do $mig$
declare
  f text;
  def text;
begin
  foreach f in array array['aps_consume_usage(integer)', 'aps_get_usage()'] loop
    def := pg_get_functiondef(('public.' || f)::regprocedure);
    def := replace(def,
      'case prof.plan when ''basic'' then 15 when ''advanced'' then 600 when ''pro'' then 2000 when ''promax'' then 5500 else 15 end',
      'case prof.plan when ''basic'' then 15 when ''advanced'' then 600 when ''pro'' then 1200 when ''promax'' then 4000 else 15 end');
    execute def;
  end loop;
end $mig$;
