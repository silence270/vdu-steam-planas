-- ============================================================
-- VDU STEAM didaktikos centras — komandos planas
-- Visas duomenų bazės paruošimas vienu paleidimu.
-- Kaip naudoti: Supabase → SQL Editor → New query → įklijuoti
-- visą šį failą → Run. Saugu leisti kelis kartus.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- Lentelės ----------

create table if not exists public.darbuotojai (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  vardas text not null,
  email text unique,
  pareigos text default '',
  atsakomybes text default '',
  savaites_valandos numeric not null default 40 check (savaites_valandos > 0),
  role text not null default 'darbuotojas' check (role in ('admin', 'darbuotojas')),
  spalva text default '#5B5BD6',
  aktyvus boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.uzduotys (
  id uuid primary key default gen_random_uuid(),
  pavadinimas text not null,
  aprasymas text default '',
  darbuotojas_id uuid references public.darbuotojai(id) on delete set null,
  valandos numeric not null default 1 check (valandos >= 0),
  terminas date,
  prioritetas text not null default 'vidutinis' check (prioritetas in ('zemas', 'vidutinis', 'aukstas')),
  statusas text not null default 'laukia' check (statusas in ('laukia', 'vykdoma', 'atlikta')),
  created_at timestamptz not null default now()
);

create table if not exists public.tvarkarastis (
  id uuid primary key default gen_random_uuid(),
  darbuotojas_id uuid not null references public.darbuotojai(id) on delete cascade,
  data date not null,
  nuo time not null default '08:00',
  iki time not null default '17:00',
  pastaba text default '',
  created_at timestamptz not null default now(),
  check (iki > nuo)
);

create index if not exists idx_uzduotys_darbuotojas on public.uzduotys(darbuotojas_id);
create index if not exists idx_tvarkarastis_darbuotojas on public.tvarkarastis(darbuotojas_id);
create index if not exists idx_tvarkarastis_data on public.tvarkarastis(data);

-- ---------- Pagalbinės funkcijos teisėms ----------

create or replace function public.my_darbuotojas_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.darbuotojai where user_id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select role = 'admin' and aktyvus from public.darbuotojai where user_id = auth.uid()),
    false
  );
$$;

-- ---------- Paskyrų susiejimas ----------
-- Kai žmogus registruojasi su el. paštu, kurį adminas įrašė
-- prie darbuotojo, paskyra susiejama automatiškai.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.darbuotojai
     set user_id = new.id
   where lower(email) = lower(new.email)
     and user_id is null;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Jei adminas el. paštą įrašo vėliau, nei žmogus jau užsiregistravęs —
-- susiejame ir tokiu atveju.
create or replace function public.link_existing_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  uid uuid;
begin
  if new.email is not null and new.user_id is null then
    select id into uid from auth.users where lower(email) = lower(new.email) limit 1;
    if uid is not null then
      new.user_id := uid;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_darbuotojas_email on public.darbuotojai;
create trigger on_darbuotojas_email
  before insert or update of email on public.darbuotojai
  for each row execute function public.link_existing_user();

-- ---------- Eilučių saugumo taisyklės (RLS) ----------

alter table public.darbuotojai enable row level security;
alter table public.uzduotys enable row level security;
alter table public.tvarkarastis enable row level security;

-- Darbuotojai: mato visi prisijungę, keičia tik adminai.
drop policy if exists darbuotojai_select on public.darbuotojai;
create policy darbuotojai_select on public.darbuotojai
  for select to authenticated using (true);

drop policy if exists darbuotojai_insert on public.darbuotojai;
create policy darbuotojai_insert on public.darbuotojai
  for insert to authenticated with check (public.is_admin());

drop policy if exists darbuotojai_update on public.darbuotojai;
create policy darbuotojai_update on public.darbuotojai
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists darbuotojai_delete on public.darbuotojai;
create policy darbuotojai_delete on public.darbuotojai
  for delete to authenticated using (public.is_admin());

-- Užduotys: mato visi; adminas valdo viską; darbuotojas gali kurti
-- užduotis sau, keisti savo užduotis ir pasiimti nepriskirtas.
drop policy if exists uzduotys_select on public.uzduotys;
create policy uzduotys_select on public.uzduotys
  for select to authenticated using (true);

drop policy if exists uzduotys_insert on public.uzduotys;
create policy uzduotys_insert on public.uzduotys
  for insert to authenticated
  with check (public.is_admin() or darbuotojas_id = public.my_darbuotojas_id());

drop policy if exists uzduotys_update on public.uzduotys;
create policy uzduotys_update on public.uzduotys
  for update to authenticated
  using (public.is_admin() or darbuotojas_id = public.my_darbuotojas_id() or darbuotojas_id is null)
  with check (public.is_admin() or darbuotojas_id = public.my_darbuotojas_id());

drop policy if exists uzduotys_delete on public.uzduotys;
create policy uzduotys_delete on public.uzduotys
  for delete to authenticated
  using (public.is_admin() or darbuotojas_id = public.my_darbuotojas_id());

-- Tvarkaraštis: mato visi; adminas valdo viską; darbuotojas — savo įrašus.
drop policy if exists tvarkarastis_select on public.tvarkarastis;
create policy tvarkarastis_select on public.tvarkarastis
  for select to authenticated using (true);

drop policy if exists tvarkarastis_insert on public.tvarkarastis;
create policy tvarkarastis_insert on public.tvarkarastis
  for insert to authenticated
  with check (public.is_admin() or darbuotojas_id = public.my_darbuotojas_id());

drop policy if exists tvarkarastis_update on public.tvarkarastis;
create policy tvarkarastis_update on public.tvarkarastis
  for update to authenticated
  using (public.is_admin() or darbuotojas_id = public.my_darbuotojas_id())
  with check (public.is_admin() or darbuotojas_id = public.my_darbuotojas_id());

drop policy if exists tvarkarastis_delete on public.tvarkarastis;
create policy tvarkarastis_delete on public.tvarkarastis
  for delete to authenticated
  using (public.is_admin() or darbuotojas_id = public.my_darbuotojas_id());

-- ---------- Gyvas atsinaujinimas (Realtime) ----------

do $$
begin
  begin
    alter publication supabase_realtime add table public.darbuotojai;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.uzduotys;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.tvarkarastis;
  exception when duplicate_object then null;
  end;
end $$;

-- ---------- Komanda (įkeliama tik jei lentelė tuščia) ----------

insert into public.darbuotojai (vardas, pareigos, role, spalva)
select v.vardas, v.pareigos, v.role, v.spalva
from (values
  ('Judita Žukauskienė',        'Vadovė',          'admin',       '#7C3AED'),
  ('Gabrielė Viduolytė',        'Pavaduotoja',     'admin',       '#0E9F6E'),
  ('Gabrielius Plungė',         'Administratorius','admin',       '#5B5BD6'),
  ('Edvina Kudakienė',          '',                'darbuotojas', '#D946EF'),
  ('Aritonė Gilė',              '',                'darbuotojas', '#F59E0B'),
  ('Emilija Jankaitytė',        '',                'darbuotojas', '#10B981'),
  ('Simona Jokubauskienė',      '',                'darbuotojas', '#3B82F6'),
  ('Simona Paul',               '',                'darbuotojas', '#EF4444'),
  ('Ugnė Filomena Gaudėšiūtė',  '',                'darbuotojas', '#8B5CF6'),
  ('Tomas Ūksas',               '',                'darbuotojas', '#14B8A6'),
  ('Povilas Dryža',             '',                'darbuotojas', '#F97316'),
  ('Artūras Karpavičius',       '',                'darbuotojas', '#6366F1'),
  ('Marius Kaminskas',          '',                'darbuotojas', '#0EA5E9'),
  ('Marta Baranauskaitė',       '',                'darbuotojas', '#EC4899'),
  ('Lina Ragelienė',            '',                'darbuotojas', '#84CC16')
) as v(vardas, pareigos, role, spalva)
where not exists (select 1 from public.darbuotojai);

-- Baigta. Dabar Supabase → Authentication → Sign In / Providers →
-- Email: išjunkite "Confirm email", kad komanda galėtų registruotis
-- iš karto be pašto patvirtinimo.
