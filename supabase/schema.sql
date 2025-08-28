-- Supabase schema for multi-tenant portfolio submissions
-- Run this in the SQL editor of your Supabase project

-- Extensions
-- Prefer installing pgcrypto in the standard Supabase schema: extensions
create extension if not exists pgcrypto with schema extensions;

-- Tables
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  created_at timestamptz default now()
);

create table if not exists public.api_keys (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  key_hash text not null,
  created_at timestamptz default now()
);

create table if not exists public.submissions (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  url text not null,
  title text not null,
  description text not null,
  created_at timestamptz default now()
);

-- RLS
alter table public.profiles enable row level security;
alter table public.api_keys enable row level security;
alter table public.submissions enable row level security;

-- Policies (clean and recreate minimal set)

-- Drop legacy policies if they exist to avoid conflicts
drop policy if exists profiles_self on public.profiles;
drop policy if exists profiles_select_self on public.profiles;
drop policy if exists profiles_modify_self on public.profiles;
drop policy if exists api_keys_self on public.api_keys;
drop policy if exists submissions_owner_write on public.submissions;

-- profiles: (optional) limit SELECT to self when used with auth; no WITH CHECK on SELECT
create policy profiles_select_self on public.profiles
  for select using (auth.uid() = id);

-- api_keys: no client access; keep RLS on and rely on grants (no policy for anon/authenticated)
revoke all on table public.api_keys from anon, authenticated;

-- submissions: public read
create policy submissions_public_read on public.submissions
  for select using (true);

-- Lock down direct writes from client; only allow SELECT
revoke all on table public.submissions from anon, authenticated;
grant select on table public.submissions to anon, authenticated;

-- Allow inserts performed by function owner (security definer) to pass RLS
drop policy if exists submissions_definer_insert on public.submissions;
create policy submissions_definer_insert on public.submissions
  for insert with check (true);

-- RPC: submit_portfolio_item
create or replace function public.submit_portfolio_item(
  p_url text,
  p_title text,
  p_description text,
  p_submit_key text
)
returns public.submissions
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid;
  v_row public.submissions;
begin
  -- Tìm user theo submit_key (so khớp bằng bcrypt/crypt)
  select k.user_id
    into v_user_id
  from public.api_keys k
  where extensions.crypt(p_submit_key, k.key_hash) = k.key_hash
  limit 1;

  if v_user_id is null then
    raise exception 'invalid submit key';
  end if;

  insert into public.submissions(user_id, url, title, description)
  values (v_user_id, p_url, p_title, p_description)
  returning * into v_row;
  return v_row;
end;
$$;

-- Allow anon to execute RPC (no login required)
grant execute on function public.submit_portfolio_item(text, text, text, text) to anon;

-- Helper upsert submit key (run with service role context)
-- Example: replace <USER_UUID> and <PLAIN_KEY>
-- insert into public.api_keys(user_id, key_hash)
-- values ('<USER_UUID>', crypt('<PLAIN_KEY>', gen_salt('bf')))
-- on conflict (user_id) do update set key_hash = excluded.key_hash;


