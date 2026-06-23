-- ============================================================
-- atnaujinimas-11.sql — VIEŠAS tvarkaraščio įrašas
-- Prideda „viesas" lauką: jei TRUE — įrašą mato visa komanda;
-- jei FALSE (numatyta) — tik tas darbuotojas ir vadovai.
-- Kaip naudoti: Supabase → SQL Editor → New query → įklijuoti → Run.
-- Saugu leisti kelis kartus.
-- ============================================================

alter table public.tvarkarastis add column if not exists viesas boolean not null default false;

-- Baigta.
