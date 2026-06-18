-- ============================================================
-- atnaujinimas-9.sql — KABINETAS (vieta) užduotims
-- Prideda neprivalomą „kabinetas" lauką darbams (užduotims).
-- Saugu paleisti pakartotinai.
-- ============================================================

alter table public.uzduotys add column if not exists kabinetas text default '';
