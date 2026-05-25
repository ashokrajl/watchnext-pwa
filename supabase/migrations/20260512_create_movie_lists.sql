-- Each device gets one row identified by a locally-generated UUID (client_id).
-- No user auth yet; RLS policies are permissive. Add auth later to restrict
-- each user to their own row.

create table movie_lists (
  client_id  uuid        primary key,
  seen       integer[]   not null default '{}',
  rejected   integer[]   not null default '{}',
  to_watch   jsonb       not null default '[]',
  updated_at timestamptz not null default now()
);

alter table movie_lists enable row level security;

create policy "allow select" on movie_lists for select using (true);
create policy "allow insert" on movie_lists for insert with check (true);
create policy "allow update" on movie_lists for update using (true) with check (true);
