-- ============================================================
-- VDU STEAM planas — atnaujinimas Nr. 5
-- Darbams (užduotims) — neprivalomas tikslus LAIKAS (terminas_laikas).
-- Kaip naudoti: Supabase → SQL Editor → New query → įklijuoti → Run.
-- Saugu leisti kelis kartus. (Be šito laikas tiesiog nesaugomas — darbai veikia.)
-- ============================================================

alter table public.uzduotys add column if not exists terminas_laikas time;

-- Baigta.
