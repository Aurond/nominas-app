-- Mis Nóminas: tabla en su propio proyecto de Supabase.
-- Pégalo una vez en supabase.com → tu proyecto → SQL Editor → Run.
create table if not exists public.nominas (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.nominas enable row level security;

drop policy if exists "nominas_leer" on public.nominas;
drop policy if exists "nominas_crear" on public.nominas;
drop policy if exists "nominas_cambiar" on public.nominas;
drop policy if exists "nominas_borrar" on public.nominas;
create policy "nominas_leer" on public.nominas for select using (auth.uid() = user_id);
create policy "nominas_crear" on public.nominas for insert with check (auth.uid() = user_id);
create policy "nominas_cambiar" on public.nominas for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "nominas_borrar" on public.nominas for delete using (auth.uid() = user_id);
