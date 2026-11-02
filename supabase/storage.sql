-- Initiativtavlan – lagring av PDF:er för Material & verktyg.
-- Kör en gång i Supabase › SQL Editor (efter schema.sql). Filen går att köra igen.
--
-- PDF:erna ligger i en PRIVAT bucket ("material"). Bara inloggade medlemmar kan ladda upp
-- och läsa dem. Sidan öppnar en fil med en länk som gäller i en timme.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('material', 'material', false, 20971520, array['application/pdf'])   -- högst 20 MB, bara PDF
  on conflict (id) do update
    set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "medlem läser material"     on storage.objects;
drop policy if exists "medlem laddar upp material" on storage.objects;
drop policy if exists "medlem tar bort material"  on storage.objects;
create policy "medlem läser material"      on storage.objects for select to authenticated
  using (bucket_id = 'material' and public.is_member());
create policy "medlem laddar upp material" on storage.objects for insert to authenticated
  with check (bucket_id = 'material' and public.is_member());
create policy "medlem tar bort material"   on storage.objects for delete to authenticated
  using (bucket_id = 'material' and public.is_member());
