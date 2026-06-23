-- ============================================================
-- atnaujinimas-10.sql — SĄRAŠAI: leisti VISIEMS pildyti
-- Visi prisijungę gali PRIDĖTI reikšmes į sąrašus (kategorijos,
-- vietos, mokyklos, veiklų tipai). Keisti / trinti — tik admin.
-- Kaip naudoti: Supabase → SQL Editor → New query → įklijuoti → Run.
-- Saugu leisti kelis kartus.
-- ============================================================

-- Pašalinam senas politikas (jei yra)
drop policy if exists app_sarasai_cud on public.app_sarasai;
drop policy if exists app_sarasai_insert on public.app_sarasai;
drop policy if exists app_sarasai_update on public.app_sarasai;
drop policy if exists app_sarasai_delete on public.app_sarasai;

-- Pridėti gali bet kuris prisijungęs vartotojas
create policy app_sarasai_insert on public.app_sarasai
  for insert to authenticated with check (true);

-- Keisti / trinti — tik administratorius
create policy app_sarasai_update on public.app_sarasai
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy app_sarasai_delete on public.app_sarasai
  for delete to authenticated using (public.is_admin());

-- (Skaitymo politika app_sarasai_select lieka iš atnaujinimas-6.sql — visi mato.)

-- Baigta.
