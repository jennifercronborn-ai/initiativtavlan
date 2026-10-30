-- Initiativtavlan – mottagare för veckosynken från initiativens webbplatser.
-- Kör en gång i Supabase › SQL Editor (efter schema.sql).
--
-- Synken använder en egen synknyckel i stället för Supabase hemliga nyckel.
-- Nyckeln kan BARA lägga in/uppdatera automatiskt hämtade träffar (events),
-- nyheter (news) och källstatus (sources). Manuellt innehåll rörs aldrig.
-- Endast nyckelns hash sparas i databasen.

create table if not exists public.sync_config (
  id          int primary key default 1 check (id = 1),
  token_hash  text not null,
  updated_at  timestamptz not null default now()
);
alter table public.sync_config enable row level security;   -- inga policies = ingen kan läsa via API
revoke all on public.sync_config from anon, authenticated;

-- Intern: skriver synkdata. Kan bara köras av databasens ägare (SQL Editor) eller via sync_import.
create or replace function public.sync_apply(p_payload jsonb)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_coll text;
  v_item jsonb;
  v_id   text;
  v_data jsonb;
  v_old  jsonb;
  n_written int := 0;
  n_kept    int := 0;
begin

  foreach v_coll in array array['events','news','sources'] loop
    for v_item in select * from jsonb_array_elements(coalesce(p_payload -> v_coll, '[]'::jsonb)) loop
      v_data := v_item - 'id';
      if v_coll = 'sources' then
        v_id := v_item ->> 'id';
        if v_id is null then continue; end if;
      else
        v_data := v_data || jsonb_build_object('source', 'auto');
        v_id := coalesce(v_item ->> 'id', v_coll || '-' || left(encode(extensions.digest(
                  concat_ws('|', v_data ->> 'initiative', v_data ->> 'date',
                            lower(trim(coalesce(v_data ->> 'title', ''))), v_data ->> 'url'), 'sha1'), 'hex'), 16));
      end if;

      select data into v_old from public.docs where collection = v_coll and id = v_id;
      if v_old is not null and v_old ->> 'source' = 'manuell' then
        n_kept := n_kept + 1; continue;
      end if;

      insert into public.docs (collection, id, data, created_by, updated_by)
        values (v_coll, v_id, coalesce(v_old, '{}'::jsonb) || v_data, 'synk', 'synk')
      on conflict (collection, id) do update set data = public.docs.data || excluded.data, updated_by = 'synk';
      n_written := n_written + 1;
    end loop;
  end loop;

  return jsonb_build_object('skrivna', n_written, 'manuella_orörda', n_kept);
end $$;

revoke all on function public.sync_apply(jsonb) from public, anon, authenticated;

create or replace function public.sync_import(p_token text, p_payload jsonb)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
begin
  if p_token is null or not exists (
       select 1 from public.sync_config
       where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')) then
    raise exception 'ogiltig synknyckel' using errcode = '28000';
  end if;
  return public.sync_apply(p_payload);
end $$;

revoke all on function public.sync_import(text, jsonb) from public;
grant execute on function public.sync_import(text, jsonb) to anon, authenticated;

-- Sätt synknyckeln (byt HASH mot sha256-hashen av nyckeln, inte nyckeln själv):
-- insert into public.sync_config (id, token_hash) values (1, 'HASH')
--   on conflict (id) do update set token_hash = excluded.token_hash, updated_at = now();
