-- ============================================================
-- atnaujinimas-8.sql — MOKYKLA + MOKINIŲ SKAIČIUS
--
-- Prideda du laukus tiek užduotims (veikloms), tiek tvarkaraščio
-- įrašams: kurioje mokykloje vyko veikla ir kiek mokinių dalyvavo.
-- „Mokykla" sąrašas (pasirinkimui) tvarkomas Nustatymuose — atskira
-- grupė app_sarasai lentelėje, schemos keisti nereikia.
--
-- Saugu paleisti pakartotinai.
-- ============================================================

alter table public.uzduotys   add column if not exists mokykla text default '';
alter table public.uzduotys   add column if not exists mokiniu_skaicius integer;

alter table public.tvarkarastis add column if not exists mokykla text default '';
alter table public.tvarkarastis add column if not exists mokiniu_skaicius integer;
