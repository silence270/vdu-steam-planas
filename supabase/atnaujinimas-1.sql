-- ============================================================
-- VDU STEAM planas — atnaujinimas Nr. 1
-- Prideda: komentarus, pranešimus, atostogas, atlikimo datą.
-- Kaip naudoti: Supabase → SQL Editor → New query → įklijuoti
-- visą failą → Run. Saugu leisti kelis kartus.
-- ============================================================

-- Darbų atlikimo data (mėnesio ataskaitoms)
alter table public.uzduotys add column if not exists atlikta_at timestamptz;

-- ---------- Komentarai prie darbų ----------

create table if not exists public.komentarai (
  id uuid primary key default gen_random_uuid(),
  uzduotis_id uuid not null references public.uzduotys(id) on delete cascade,
  darbuotojas_id uuid not null references public.darbuotojai(id) on delete cascade,
  tekstas text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_komentarai_uzduotis on public.komentarai(uzduotis_id);

alter table public.komentarai enable row level security;

drop policy if exists komentarai_select on public.komentarai;
create policy komentarai_select on public.komentarai
  for select to authenticated using (true);

drop policy if exists komentarai_insert on public.komentarai;
create policy komentarai_insert on public.komentarai
  for insert to authenticated
  with check (darbuotojas_id = public.my_darbuotojas_id());

drop policy if exists komentarai_delete on public.komentarai;
create policy komentarai_delete on public.komentarai
  for delete to authenticated
  using (public.is_admin() or darbuotojas_id = public.my_darbuotojas_id());

-- ---------- Pranešimai ----------

create table if not exists public.pranesimai (
  id uuid primary key default gen_random_uuid(),
  darbuotojas_id uuid not null references public.darbuotojai(id) on delete cascade,
  tekstas text not null,
  vaizdas text default 'darbai',
  perskaityta boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_pranesimai_gavejas on public.pranesimai(darbuotojas_id, perskaityta);

alter table public.pranesimai enable row level security;

drop policy if exists pranesimai_select on public.pranesimai;
create policy pranesimai_select on public.pranesimai
  for select to authenticated
  using (darbuotojas_id = public.my_darbuotojas_id());

drop policy if exists pranesimai_insert on public.pranesimai;
create policy pranesimai_insert on public.pranesimai
  for insert to authenticated with check (true);

drop policy if exists pranesimai_update on public.pranesimai;
create policy pranesimai_update on public.pranesimai
  for update to authenticated
  using (darbuotojas_id = public.my_darbuotojas_id())
  with check (darbuotojas_id = public.my_darbuotojas_id());

drop policy if exists pranesimai_delete on public.pranesimai;
create policy pranesimai_delete on public.pranesimai
  for delete to authenticated
  using (darbuotojas_id = public.my_darbuotojas_id() or public.is_admin());

-- ---------- Atostogos / nedarbingumas ----------

create table if not exists public.atostogos (
  id uuid primary key default gen_random_uuid(),
  darbuotojas_id uuid not null references public.darbuotojai(id) on delete cascade,
  nuo date not null,
  iki date not null,
  tipas text not null default 'atostogos' check (tipas in ('atostogos', 'liga', 'kita')),
  pastaba text default '',
  created_at timestamptz not null default now(),
  check (iki >= nuo)
);
create index if not exists idx_atostogos_darbuotojas on public.atostogos(darbuotojas_id);

alter table public.atostogos enable row level security;

drop policy if exists atostogos_select on public.atostogos;
create policy atostogos_select on public.atostogos
  for select to authenticated using (true);

drop policy if exists atostogos_insert on public.atostogos;
create policy atostogos_insert on public.atostogos
  for insert to authenticated
  with check (public.is_admin() or darbuotojas_id = public.my_darbuotojas_id());

drop policy if exists atostogos_update on public.atostogos;
create policy atostogos_update on public.atostogos
  for update to authenticated
  using (public.is_admin() or darbuotojas_id = public.my_darbuotojas_id())
  with check (public.is_admin() or darbuotojas_id = public.my_darbuotojas_id());

drop policy if exists atostogos_delete on public.atostogos;
create policy atostogos_delete on public.atostogos
  for delete to authenticated
  using (public.is_admin() or darbuotojas_id = public.my_darbuotojas_id());

-- ---------- Pranešimas adminams apie naują registraciją ----------

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  linked_name text;
begin
  update public.darbuotojai
     set user_id = new.id
   where lower(email) = lower(new.email)
     and user_id is null
  returning vardas into linked_name;

  if linked_name is not null then
    insert into public.pranesimai (darbuotojas_id, tekstas, vaizdas)
    select id, linked_name || ' užsiregistravo sistemoje', 'komanda'
      from public.darbuotojai
     where role = 'admin' and aktyvus;
  end if;

  return new;
end;
$$;

-- ---------- Gyvas atsinaujinimas naujoms lentelėms ----------

do $$
begin
  begin
    alter publication supabase_realtime add table public.komentarai;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.pranesimai;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.atostogos;
  exception when duplicate_object then null;
  end;
end $$;

-- Baigta.
