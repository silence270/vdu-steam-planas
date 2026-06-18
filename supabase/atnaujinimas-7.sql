-- ============================================================
-- atnaujinimas-7.sql — TELEFONO PRANEŠIMAI (Web Push prenumeratos)
--
-- Sukuria lentelę įrenginių push prenumeratoms + saugų RPC, kuris
-- prenumeratą susieja su prisijungusiu darbuotoju. Realų laišką/push
-- siunčia Supabase Edge Function „pranesti" (žr. DIEGIMAS-PRANESIMAI.md).
--
-- Saugu paleisti pakartotinai.
-- ============================================================

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  darbuotojas_id uuid not null references public.darbuotojai(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text default '',
  created_at timestamptz not null default now()
);
create index if not exists idx_push_subs_emp on public.push_subscriptions(darbuotojas_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_subs_select on public.push_subscriptions;
create policy push_subs_select on public.push_subscriptions
  for select to authenticated
  using (darbuotojas_id = public.my_darbuotojas_id() or public.is_admin());

drop policy if exists push_subs_delete on public.push_subscriptions;
create policy push_subs_delete on public.push_subscriptions
  for delete to authenticated
  using (darbuotojas_id = public.my_darbuotojas_id() or public.is_admin());

-- Įrašymą tvarko SECURITY DEFINER funkcija: prenumeratą visada
-- pririša prie prisijungusio darbuotojo (klientui RLS insert nereikia).
create or replace function public.save_push_subscription(
  p_endpoint text, p_p256dh text, p_auth text, p_ua text default ''
) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid;
begin
  me := public.my_darbuotojas_id();
  if me is null then
    raise exception 'Nėra susieto darbuotojo';
  end if;
  insert into public.push_subscriptions (darbuotojas_id, endpoint, p256dh, auth, user_agent)
  values (me, p_endpoint, p_p256dh, p_auth, coalesce(p_ua, ''))
  on conflict (endpoint) do update
    set darbuotojas_id = excluded.darbuotojas_id,
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        user_agent = excluded.user_agent;
end;
$$;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;
