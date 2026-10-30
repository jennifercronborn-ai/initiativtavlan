-- Initiativtavlan – databasschema för Supabase (region Stockholm, eu-north-1)
-- Kör hela filen i Supabase › SQL Editor. Filen går att köra igen utan att data försvinner.
--
-- Upplägg
--   docs        All data på tavlan. En rad per objekt, grupperat på "collection":
--               events, news, groups, notes, sources, network, resources, board,
--               profiles, contacts, ideas (samma namn som i sidan).
--   members     Vem som får logga in, med roll och initiativ.
--   audit_log   Ändringslogg: vem, när, vad (fylls automatiskt).

create extension if not exists pgcrypto;

-- ---------- medlemmar ----------
create table if not exists public.members (
  email       text primary key check (email = lower(email)),
  name        text,
  initiative  text,                      -- nyckel, t.ex. 'lfm30', 'upk'
  role        text not null default 'lasare' check (role in ('admin','redaktor','lasare')),
  created_at  timestamptz not null default now()
);

create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.members where email = lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select public.my_role() is not null;
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select public.my_role() = 'admin';
$$;

-- ---------- data ----------
create table if not exists public.docs (
  collection  text not null,
  id          text not null,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  created_by  text default lower(auth.jwt() ->> 'email'),
  updated_at  timestamptz not null default now(),
  updated_by  text default lower(auth.jwt() ->> 'email'),
  primary key (collection, id)
);
create index if not exists docs_collection_idx on public.docs (collection, created_at);

create or replace function public.docs_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(lower(auth.jwt() ->> 'email'), new.updated_by, 'system');
  return new;
end $$;
drop trigger if exists docs_touch on public.docs;
create trigger docs_touch before update on public.docs
  for each row execute function public.docs_touch();

-- Slår ihop fält i ett befintligt objekt (motsvarar doc(...).update i sidan).
create or replace function public.docs_merge(p_collection text, p_id text, p_patch jsonb)
returns void language sql security invoker set search_path = public as $$
  update public.docs set data = data || p_patch
  where collection = p_collection and id = p_id;
$$;

-- ---------- ändringslogg ----------
create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  collection  text,
  row_id      text,
  action      text,
  old         jsonb,
  new         jsonb,
  changed_by  text default coalesce(lower(auth.jwt() ->> 'email'), 'system'),
  changed_at  timestamptz not null default now()
);

create or replace function public.docs_audit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_log (collection, row_id, action, old, new)
  values (coalesce(new.collection, old.collection), coalesce(new.id, old.id), tg_op,
          case when tg_op <> 'INSERT' then old.data end,
          case when tg_op <> 'DELETE' then new.data end);
  return coalesce(new, old);
end $$;
drop trigger if exists docs_audit on public.docs;
create trigger docs_audit after insert or update or delete on public.docs
  for each row execute function public.docs_audit();

-- ---------- behörigheter (Row Level Security) ----------
alter table public.members   enable row level security;
alter table public.docs      enable row level security;
alter table public.audit_log enable row level security;

drop policy if exists "medlem läser"        on public.docs;
drop policy if exists "medlem skapar"       on public.docs;
drop policy if exists "medlem ändrar"       on public.docs;
drop policy if exists "medlem tar bort"     on public.docs;
create policy "medlem läser"    on public.docs for select to authenticated using (public.is_member());
create policy "medlem skapar"   on public.docs for insert to authenticated with check (public.is_member());
create policy "medlem ändrar"   on public.docs for update to authenticated using (public.is_member()) with check (public.is_member());
-- Som i prototypen får alla inloggade ta bort lappar och träffar. Ändringsloggen sparar det borttagna.
-- Vill ni begränsa: byt public.is_member() mot (public.my_role() in ('admin','redaktor')).
create policy "medlem tar bort" on public.docs for delete to authenticated using (public.is_member());

drop policy if exists "se sig själv"      on public.members;
drop policy if exists "admin hanterar"    on public.members;
create policy "se sig själv"   on public.members for select to authenticated
  using (email = lower(auth.jwt() ->> 'email') or public.is_admin());
create policy "admin hanterar" on public.members for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin läser logg" on public.audit_log;
create policy "admin läser logg" on public.audit_log for select to authenticated using (public.is_admin());

-- ---------- realtid (ändringar syns direkt för alla) ----------
do $$ begin
  alter publication supabase_realtime add table public.docs;
exception when duplicate_object then null; end $$;

-- ---------- första admin ----------
-- Byt adressen och kör raden nedan en gång. Skapa sedan samma användare i
-- Authentication › Users › Add user (eller med scripts/invite.mjs).
-- insert into public.members (email, name, initiative, role)
--   values ('din.adress@lfm30.se', 'Ditt namn', 'lfm30', 'admin') on conflict (email) do nothing;
