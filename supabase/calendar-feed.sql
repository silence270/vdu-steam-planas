-- ============================================================
-- Kalendoriaus „feed" funkcija — grąžina tvarkaraščio pamainas,
-- jei pateiktas teisingas slaptas raktas. Naudoja Netlify funkcija
-- (calendar.js), kuri iš to suformuoja .ics kalendorių Outlook'ui.
--
-- SVARBU: vietoj __SLAPTAS_TOKENAS__ įrašykite tikrą raktą (tą patį,
-- kurį nustatysite Netlify aplinkos kintamajame CAL_TOKEN).
-- Šis failas repozitorijoje laikomas BE tikro rakto (saugumui).
-- ============================================================

create or replace function public.calendar_feed(p_token text)
returns table(id uuid, darbuotojas text, data date, nuo time, iki time, pastaba text)
language sql security definer set search_path = public as $$
  select t.id, d.vardas, t.data, t.nuo, t.iki, coalesce(t.pastaba, '')
  from public.tvarkarastis t
  join public.darbuotojai d on d.id = t.darbuotojas_id
  where p_token = '__SLAPTAS_TOKENAS__'
  order by t.data, t.nuo;
$$;

grant execute on function public.calendar_feed(text) to anon, authenticated;
