-- Morrowlane Service Request Portal: rate limiting
-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.
--
-- Why in the database? On Netlify the API runs as many short-lived copies,
-- so a counter kept in memory isn't shared between them. A table is.

-- 1. One row per write attempt. "key" is a hashed visitor id + action,
--    e.g. "post:3f9a…" (the raw IP address is never stored).
create table if not exists public.rate_limit_hits (
  id         bigint generated always as identity primary key,
  key        text not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_hits_key_time
  on public.rate_limit_hits (key, created_at);

-- 2. Lock the table down: RLS on with NO policies, so the app's anon key
--    can't read or change it directly. Only the function below can.
alter table public.rate_limit_hits enable row level security;

-- 3. check_rate_limit: returns true (allowed) and records the hit, or
--    false (over the limit) without recording it.
create or replace function public.check_rate_limit(
  p_key            text,
  p_limit          integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  recent integer;
begin
  -- Handle simultaneous requests from the same visitor one at a time,
  -- so 20 parallel requests can't all sneak in under the limit.
  perform pg_advisory_xact_lock(hashtext(p_key));

  -- Housekeeping: forget hits older than an hour.
  delete from rate_limit_hits where created_at < now() - interval '1 hour';

  select count(*) into recent
  from rate_limit_hits
  where key = p_key
    and created_at > now() - make_interval(secs => p_window_seconds);

  if recent >= p_limit then
    return false;
  end if;

  insert into rate_limit_hits (key) values (p_key);
  return true;
end;
$$;

revoke all on function public.check_rate_limit(text, integer, integer) from public;
grant execute on function public.check_rate_limit(text, integer, integer) to anon;
