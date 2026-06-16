-- ============================================================
-- Kalendoriaus „feed" funkcija (calendar_feed) — token-gated.
-- Grąžina: PAMAINAS (tvarkaraštis) + DARBUS (užduotys su terminu).
-- „Visiems" priskirta veikla (ta pati pavadinimas+terminas keliems
-- darbuotojams) sugrupuojama į VIENĄ įrašą („… (visiems)"), kad
-- Outlook'e nebūtų spamo.
--
-- SVARBU: vietoj __SLAPTAS_TOKENAS__ įrašykite tikrą raktą (tą patį,
-- kuris Netlify env CAL_TOKEN). Repo laikomas BE tikro rakto.
-- Veikia su esama Netlify funkcija (calendar.js) — deploy'o NEREIKIA,
-- užtenka paleisti šį SQL Supabase SQL Editor lange.
-- ============================================================

drop function if exists public.calendar_feed(text);
create function public.calendar_feed(p_token text)
returns table(id text, darbuotojas text, data date, nuo time, iki time, pastaba text)
language sql security definer set search_path = public as $$
  -- Pamainos
  select t.id::text, d.vardas, t.data, t.nuo, t.iki, coalesce(t.pastaba, '')
  from public.tvarkarastis t
  join public.darbuotojai d on d.id = t.darbuotojas_id
  where p_token = '__SLAPTAS_TOKENAS__'
  union all
  -- Darbai (užduotys su terminu); „visiems" — vienas įrašas
  select 'd_' || md5(lower(u.pavadinimas) || '|' || u.terminas::text),
         u.pavadinimas || case
           when count(distinct u.darbuotojas_id) > 1 then ' (visiems)'
           when max(dd.vardas) is not null then ' — ' || max(dd.vardas)
           else '' end,
         u.terminas, time '00:00', time '23:59', ''
  from public.uzduotys u
  left join public.darbuotojai dd on dd.id = u.darbuotojas_id
  where p_token = '__SLAPTAS_TOKENAS__'
    and u.terminas is not null
    and u.statusas <> 'atlikta'
  group by u.pavadinimas, u.terminas;
$$;
grant execute on function public.calendar_feed(text) to anon, authenticated;
