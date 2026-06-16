-- ============================================================
-- VDU STEAM planas — atnaujinimas Nr. 6
-- Admino valdomi SĄRAŠAI (veiklų tipai, kategorijos, nedarbo tipai, vietos)
-- + tvarkaraščio įrašo „tipas" ir „vieta".
-- Kaip naudoti: Supabase → SQL Editor → New query → įklijuoti → Run.
-- Saugu leisti kelis kartus.
-- ============================================================

create table if not exists public.app_sarasai (
  id uuid primary key default gen_random_uuid(),
  grupe text not null,            -- 'veiklos_tipas' | 'kategorija' | 'nedarbo_tipas' | 'vieta'
  reiksme text not null,
  tvarka int not null default 0,
  created_at timestamptz not null default now()
);
create unique index if not exists idx_app_sarasai_uni on public.app_sarasai(grupe, lower(reiksme));

alter table public.app_sarasai enable row level security;
drop policy if exists app_sarasai_select on public.app_sarasai;
create policy app_sarasai_select on public.app_sarasai for select to authenticated using (true);
drop policy if exists app_sarasai_cud on public.app_sarasai;
create policy app_sarasai_cud on public.app_sarasai for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Tvarkaraščio įrašo veiklos tipas ir vieta
alter table public.tvarkarastis add column if not exists tipas text default '';
alter table public.tvarkarastis add column if not exists vieta text default '';

-- Atostogų tipas — nebe fiksuotas (kad būtų valdomas sąrašu)
alter table public.atostogos drop constraint if exists atostogos_tipas_check;

-- Pradinės reikšmės (tik jei dar nėra). Lietuviškos raidės — Unicode kodu, kad neiškraiptų.
insert into public.app_sarasai (grupe, reiksme, tvarka)
select g, r, t from (values
  ('veiklos_tipas', 'Susirinkimas', 1),
  ('veiklos_tipas', 'Veikla', 2),
  ('veiklos_tipas', 'Mokymai', 3),
  ('veiklos_tipas', U&'Dirbtuv\0117s', 4),
  ('kategorija', 'Edukacija', 1),
  ('kategorija', 'Renginys', 2),
  ('kategorija', 'Susirinkimas', 3),
  ('kategorija', 'Administracija', 4),
  ('kategorija', U&'Metodin\0117 veikla', 5),
  ('kategorija', 'Projektas', 6),
  ('kategorija', 'Kita', 7),
  ('nedarbo_tipas', 'Atostogos', 1),
  ('nedarbo_tipas', 'Liga', 2),
  ('nedarbo_tipas', 'Kita', 3)
) as v(g, r, t)
where not exists (select 1 from public.app_sarasai s where s.grupe = v.g and lower(s.reiksme) = lower(v.r));

do $$
begin
  begin alter publication supabase_realtime add table public.app_sarasai; exception when duplicate_object then null; end;
end $$;

-- Baigta.
