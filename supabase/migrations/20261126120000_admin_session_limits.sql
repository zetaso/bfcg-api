-- Server-enforced admin session limits (idle + absolute), on top of Supabase Auth.
--
-- Every Supabase access token carries a `session_id` claim that stays the same across refreshes.
-- We track each admin session here and refuse it once it has been idle or alive for too long.
-- is_admin() (used by every write policy) also requires a live session, so the limits apply even
-- to someone calling the Supabase Data API directly with a copied token.
--
-- Change the limits with:  update public.admin_session_policy set idle_timeout = '30 minutes';

create table if not exists public.admin_session_policy (
  id boolean primary key default true check (id), -- single row
  idle_timeout interval not null,
  absolute_timeout interval not null
);

insert into public.admin_session_policy (id, idle_timeout, absolute_timeout)
values (true, interval '1 hour', interval '8 hours')
on conflict (id) do nothing;

create table if not exists public.admin_sessions (
  session_id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamp with time zone not null default now(),
  last_seen_at timestamp with time zone not null default now(),
  revoked_at timestamp with time zone,
  revoked_reason text
);

create index if not exists admin_sessions_user_id_idx on public.admin_sessions (user_id);

-- No policies and no grants: these tables are only reachable through the functions below.
alter table public.admin_session_policy enable row level security;
alter table public.admin_sessions enable row level security;
revoke all on table public.admin_session_policy, public.admin_sessions from anon, authenticated;

create or replace function public.current_session_id()
returns uuid
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'session_id', '')::uuid;
$$;

-- Admin AND the current session is live. Used by all write policies and storage policies.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admins a
    join public.admin_sessions s on s.user_id = a.user_id
    cross join public.admin_session_policy p
    where a.user_id = auth.uid()
      and s.session_id = public.current_session_id()
      and s.revoked_at is null
      and now() - s.last_seen_at <= p.idle_timeout
      and now() - s.created_at <= p.absolute_timeout
  );
$$;

/**
 * Called by the API on login and on every admin request.
 * Registers the session on first use, expires it when a limit is exceeded, otherwise marks it active.
 * Returns { status: 'ok' | 'expired' | 'not_admin' | 'unauthenticated', ... }.
 */
create or replace function public.admin_session_touch()
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  sid uuid := public.current_session_id();
  pol public.admin_session_policy;
  ses public.admin_sessions;
  reason text;
begin
  if uid is null or sid is null then
    return jsonb_build_object('status', 'unauthenticated');
  end if;

  if not exists (select 1 from public.admins where user_id = uid) then
    return jsonb_build_object('status', 'not_admin');
  end if;

  select * into pol from public.admin_session_policy limit 1;

  insert into public.admin_sessions (session_id, user_id)
  values (sid, uid)
  on conflict (session_id) do nothing;

  -- housekeeping: forget sessions that ended more than a week ago
  delete from public.admin_sessions
  where created_at < now() - pol.absolute_timeout - interval '7 days';

  select * into ses from public.admin_sessions where session_id = sid for update;

  if ses.user_id <> uid then
    return jsonb_build_object('status', 'unauthenticated');
  end if;

  if ses.revoked_at is not null then
    return jsonb_build_object('status', 'expired', 'reason', coalesce(ses.revoked_reason, 'revoked'));
  end if;

  if now() - ses.last_seen_at > pol.idle_timeout then
    reason := 'idle';
  elsif now() - ses.created_at > pol.absolute_timeout then
    reason := 'absolute';
  end if;

  if reason is not null then
    update public.admin_sessions set revoked_at = now(), revoked_reason = reason where session_id = sid;
    return jsonb_build_object('status', 'expired', 'reason', reason);
  end if;

  update public.admin_sessions set last_seen_at = now() where session_id = sid;

  return jsonb_build_object(
    'status', 'ok',
    'idle_timeout_seconds', extract(epoch from pol.idle_timeout)::int,
    'expires_at', ses.created_at + pol.absolute_timeout
  );
end;
$$;

-- Ends the current session (logout), or every other session of the same user.
create or replace function public.admin_session_revoke(others boolean default false)
returns void
language sql
volatile
security definer
set search_path = public
as $$
  update public.admin_sessions
  set revoked_at = now(), revoked_reason = case when others then 'revoked_by_user' else 'logout' end
  where user_id = auth.uid()
    and revoked_at is null
    and (case when others then session_id <> public.current_session_id()
              else session_id = public.current_session_id() end);
$$;

revoke all on function public.current_session_id() from public;
revoke all on function public.admin_session_touch() from public;
revoke all on function public.admin_session_revoke(boolean) from public;
grant execute on function public.current_session_id() to authenticated;
grant execute on function public.admin_session_touch() to authenticated;
grant execute on function public.admin_session_revoke(boolean) to authenticated;
