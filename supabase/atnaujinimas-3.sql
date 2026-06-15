-- ============================================================
-- VDU STEAM planas — atnaujinimas Nr. 3
-- Prideda 'vadovas' rolę:
--   • vadovai mato komandos užkrovą (kaip ir adminai);
--   • administratorius gali „žiūrėti kaip narys" (peržiūra sąsajoje).
-- Kaip naudoti: Supabase → SQL Editor → New query → įklijuoti → Run.
-- Saugu leisti kelis kartus.
-- ============================================================

-- Leidžiame rolės reikšmę 'vadovas' (anksčiau buvo tik admin/darbuotojas).
alter table public.darbuotojai drop constraint if exists darbuotojai_role_check;
alter table public.darbuotojai
  add constraint darbuotojai_role_check
  check (role in ('admin', 'vadovas', 'darbuotojas'));

-- Baigta. Roles žmonėms keičiamos programėlėje: Komanda → Redaguoti → Rolė.
