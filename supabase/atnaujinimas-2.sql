-- ============================================================
-- VDU STEAM planas — atnaujinimas Nr. 2
-- Prideda „kuratoriaus" ryšį: darbuotojas gali būti priskirtas
-- valdyti kito darbuotojo darbus / grafiką / atostogas (be admino).
-- Kaip naudoti: Supabase → SQL Editor → įklijuoti → Run. Saugu kartoti.
-- (Konkretūs priskyrimai — pvz., kas ką kuruoja — daromi atskirai,
--  per sistemą arba SQL; čia tik struktūra ir taisyklės.)
-- ============================================================

-- Kuratorius: kuris darbuotojas gali valdyti šio darbuotojo įrašus
alter table public.darbuotojai add column if not exists kuratorius_id uuid references public.darbuotojai(id) on delete set null;

-- Ar dabartinis vartotojas kuruoja darbuotoją p_emp?
create or replace function public.manages(p_emp uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.darbuotojai e
    where e.id = p_emp and e.kuratorius_id = public.my_darbuotojas_id()
  );
$$;
grant execute on function public.manages(uuid) to authenticated;

-- RLS: kuratorius gali valdyti kuruojamų darbuotojų įrašus
drop policy if exists uzduotys_insert on public.uzduotys;
create policy uzduotys_insert on public.uzduotys for insert to authenticated
  with check (public.is_admin() or darbuotojas_id = public.my_darbuotojas_id() or public.manages(darbuotojas_id));
drop policy if exists uzduotys_update on public.uzduotys;
create policy uzduotys_update on public.uzduotys for update to authenticated
  using (public.is_admin() or darbuotojas_id = public.my_darbuotojas_id() or darbuotojas_id is null or public.manages(darbuotojas_id))
  with check (public.is_admin() or darbuotojas_id = public.my_darbuotojas_id() or public.manages(darbuotojas_id));
drop policy if exists uzduotys_delete on public.uzduotys;
create policy uzduotys_delete on public.uzduotys for delete to authenticated
  using (public.is_admin() or darbuotojas_id = public.my_darbuotojas_id() or public.manages(darbuotojas_id));

drop policy if exists tvarkarastis_insert on public.tvarkarastis;
create policy tvarkarastis_insert on public.tvarkarastis for insert to authenticated
  with check (public.is_admin() or darbuotojas_id = public.my_darbuotojas_id() or public.manages(darbuotojas_id));
drop policy if exists tvarkarastis_update on public.tvarkarastis;
create policy tvarkarastis_update on public.tvarkarastis for update to authenticated
  using (public.is_admin() or darbuotojas_id = public.my_darbuotojas_id() or public.manages(darbuotojas_id))
  with check (public.is_admin() or darbuotojas_id = public.my_darbuotojas_id() or public.manages(darbuotojas_id));
drop policy if exists tvarkarastis_delete on public.tvarkarastis;
create policy tvarkarastis_delete on public.tvarkarastis for delete to authenticated
  using (public.is_admin() or darbuotojas_id = public.my_darbuotojas_id() or public.manages(darbuotojas_id));

drop policy if exists atostogos_insert on public.atostogos;
create policy atostogos_insert on public.atostogos for insert to authenticated
  with check (public.is_admin() or darbuotojas_id = public.my_darbuotojas_id() or public.manages(darbuotojas_id));
drop policy if exists atostogos_update on public.atostogos;
create policy atostogos_update on public.atostogos for update to authenticated
  using (public.is_admin() or darbuotojas_id = public.my_darbuotojas_id() or public.manages(darbuotojas_id))
  with check (public.is_admin() or darbuotojas_id = public.my_darbuotojas_id() or public.manages(darbuotojas_id));
drop policy if exists atostogos_delete on public.atostogos;
create policy atostogos_delete on public.atostogos for delete to authenticated
  using (public.is_admin() or darbuotojas_id = public.my_darbuotojas_id() or public.manages(darbuotojas_id));

-- Baigta.
