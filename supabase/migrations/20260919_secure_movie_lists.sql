-- Secure the movie_lists table.
--
-- Run this ONCE in the Supabase SQL editor (Dashboard > SQL > New query).
--
-- What it does:
--   1. Adds an unguessable per-row `secret`. A client can only read or write
--      a row when it knows BOTH the client_id and the secret.
--   2. Drops the permissive "allow all" policies. With RLS enabled and no
--      policies, anonymous clients cannot touch the table directly at all.
--   3. Adds two SECURITY DEFINER functions that check the secret inside the
--      database, so the check cannot be bypassed from the client.
--
-- Backwards compatibility: until you run this migration, the app keeps using
-- the previous direct-table access. After you run it, the app automatically
-- switches to the secure RPC path (no app update needed beyond the code that
-- ships with this migration).
--
-- Note: rows created before this migration get random secrets that no device
-- knows. Those orphaned rows become unreachable; each device simply re-creates
-- its row from its local copy on the next save. No on-device data is lost.

-- 1. Per-row secret (pgcrypto's gen_random_uuid is available by default on Supabase).
alter table movie_lists
  add column if not exists secret text not null default gen_random_uuid()::text;

-- 2. Remove the permissive policies -> direct anonymous access is denied.
drop policy if exists "allow select" on movie_lists;
drop policy if exists "allow insert" on movie_lists;
drop policy if exists "allow update" on movie_lists;

-- 3a. Secure read: returns the row only when id AND secret match.
create or replace function get_movie_list(p_client_id uuid, p_secret text)
returns table (
  seen       integer[],
  rejected   integer[],
  to_watch   jsonb,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select m.seen, m.rejected, m.to_watch, m.updated_at
  from movie_lists m
  where m.client_id = p_client_id
    and m.secret = p_secret;
$$;

-- 3b. Secure write: upserts the row, but fails closed when the secret does not
-- match an existing row.
create or replace function save_movie_list(
  p_client_id uuid,
  p_secret    text,
  p_seen      integer[],
  p_rejected  integer[],
  p_to_watch  jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_secret text;
begin
  select m.secret into v_existing_secret
  from movie_lists m
  where m.client_id = p_client_id;

  if found and v_existing_secret is distinct from p_secret then
    raise exception 'forbidden: secret mismatch' using errcode = '42501';
  end if;

  insert into movie_lists (client_id, secret, seen, rejected, to_watch, updated_at)
  values (p_client_id, p_secret, p_seen, p_rejected, p_to_watch, now())
  on conflict (client_id) do update set
    seen       = excluded.seen,
    rejected   = excluded.rejected,
    to_watch   = excluded.to_watch,
    updated_at = now();
end;
$$;

grant execute on function get_movie_list(uuid, text) to anon;
grant execute on function save_movie_list(uuid, text, integer[], integer[], jsonb) to anon;
