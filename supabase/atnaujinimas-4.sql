-- ============================================================
-- VDU STEAM planas — atnaujinimas Nr. 4
-- „Prieinamumas": kada darbuotojas gali dirbti / vesti veiklas.
--   • prieinamumas_sablonas — kassavaitinis šablonas (pagal savaitės dieną)
--   • prieinamumas — konkrečios datos pakoregavimai (override tik tai savaitei)
-- Kaip naudoti: Supabase → SQL Editor → New query → įklijuoti → Run.
-- Saugu leisti kelis kartus.
-- ============================================================

-- Kassavaitinis šablonas: savaite_diena 1=Pirmadienis .. 7=Sekmadienis
create table if not exists public.prieinamumas_sablonas (
  id uuid primary key default gen_random_uuid(),
  darbuotojas_id uuid not null references public.darbuotojai(id) on delete cascade,
  savaite_diena smallint not null check (savaite_diena between 1 and 7),
  nuo time not null,
  iki time not null,
  created_at timestamptz not null default now(),
  check (iki > nuo)
);
create index if not exists idx_prieinamumas_sablonas_darb on public.prieinamumas_sablonas(darbuotojas_id);

-- Konkrečios datos pakoregavimai. nedirba=true reiškia „tą dieną negaliu".
create table if not exists public.prieinamumas (
  id uuid primary key default gen_random_uuid(),
  darbuotojas_id uuid not null references public.darbuotojai(id) on delete cascade,
  data date not null,
  nuo time,
  iki time,
  nedirba boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_prieinamumas_darb on public.prieinamumas(darbuotojas_id, data);

-- ---------- RLS ----------
alter table public.prieinamumas_sablonas enable row level security;
alter table public.prieinamumas enable row level security;

-- Skaityti gali visi prisijungę (planavimui).
-- Keisti — pats, administratorius arba kuratorius (manages()).
drop policy if exists prieinamumas_sablonas_select on public.prieinamumas_sablonas;
create policy prieinamumas_sablonas_select on public.prieinamumas_sablonas
  for select to authenticated using (true);
drop policy if exists prieinamumas_sablonas_cud on public.prieinamumas_sablonas;
create policy prieinamumas_sablonas_cud on public.prieinamumas_sablonas
  for all to authenticated
  using (public.is_admin() or darbuotojas_id = public.my_darbuotojas_id() or public.manages(darbuotojas_id))
  with check (public.is_admin() or darbuotojas_id = public.my_darbuotojas_id() or public.manages(darbuotojas_id));

drop policy if exists prieinamumas_select on public.prieinamumas;
create policy prieinamumas_select on public.prieinamumas
  for select to authenticated using (true);
drop policy if exists prieinamumas_cud on public.prieinamumas;
create policy prieinamumas_cud on public.prieinamumas
  for all to authenticated
  using (public.is_admin() or darbuotojas_id = public.my_darbuotojas_id() or public.manages(darbuotojas_id))
  with check (public.is_admin() or darbuotojas_id = public.my_darbuotojas_id() or public.manages(darbuotojas_id));

-- ---------- Gyvas atsinaujinimas ----------
do $$
begin
  begin alter publication supabase_realtime add table public.prieinamumas_sablonas; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.prieinamumas; exception when duplicate_object then null; end;
end $$;

-- Baigta.
