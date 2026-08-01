-- Social media core for the official Prontusfy accounts only.
-- Tokens are intentionally inaccessible to anon and authenticated roles.

create extension if not exists pgcrypto;
create schema if not exists private;

create or replace function private.sanitize_social_payload(payload jsonb)
returns jsonb
language plpgsql
immutable
security invoker
set search_path = pg_catalog, public, private
as $$
declare
  result jsonb;
  item record;
  key_name text;
  sensitive_keys text[] := array[
    'access_token', 'refresh_token', 'client_secret', 'authorization',
    'apikey', 'api_key', 'secret', 'password'
  ];
begin
  if payload is null then
    return null;
  end if;

  case jsonb_typeof(payload)
    when 'object' then
      result := '{}'::jsonb;
      for item in select key, value from jsonb_each(payload)
      loop
        key_name := lower(item.key);
        if key_name = any(sensitive_keys) then
          result := result || jsonb_build_object(item.key, '[REDACTED]');
        else
          result := result || jsonb_build_object(item.key, private.sanitize_social_payload(item.value));
        end if;
      end loop;
      return result;
    when 'array' then
      return coalesce((select jsonb_agg(private.sanitize_social_payload(value)) from jsonb_array_elements(payload)), '[]'::jsonb);
    else
      return payload;
  end case;
end;
$$;

create or replace function private.social_expiry_from_seconds(seconds_value bigint)
returns timestamptz
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select now() + make_interval(secs => greatest(coalesce(seconds_value, 0), 0));
$$;

create or replace function private.touch_social_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create table if not exists public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  account_id text,
  account_name text,
  access_token text,
  refresh_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  token_type text,
  scopes text,
  status text not null default 'disconnected',
  last_refresh_at timestamptz,
  last_refresh_error text,
  reconnect_required_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint social_accounts_platform_check check (platform in ('facebook', 'instagram', 'tiktok')),
  constraint social_accounts_status_check check (status in ('connected', 'disconnected', 'refreshing', 'reconnect_required', 'error')),
  constraint social_accounts_platform_unique unique (platform)
);

create table if not exists public.scheduled_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  caption text not null default '',
  media_type text not null,
  media_url text,
  platforms text[] not null,
  scheduled_for timestamptz not null,
  status text not null default 'draft',
  processing_started_at timestamptz,
  published_at timestamptz,
  retry_count integer not null default 0,
  max_retries integer not null default 3,
  last_error_code text,
  last_error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scheduled_posts_media_type_check check (media_type in ('text', 'image', 'video')),
  constraint scheduled_posts_status_check check (status in ('draft', 'pending', 'processing', 'published', 'partially_published', 'failed', 'cancelled')),
  constraint scheduled_posts_platforms_check check (cardinality(platforms) > 0 and platforms <@ array['facebook', 'instagram', 'tiktok']::text[]),
  constraint scheduled_posts_retry_check check (retry_count >= 0 and max_retries between 0 and 10)
);

create table if not exists public.publication_logs (
  id uuid primary key default gen_random_uuid(),
  scheduled_post_id uuid not null references public.scheduled_posts(id) on delete cascade,
  platform text not null,
  status text not null,
  external_post_id text,
  external_publish_id text,
  external_url text,
  attempt integer not null default 1,
  error_code text,
  error_message text,
  response_sanitized jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint publication_logs_platform_check check (platform in ('facebook', 'instagram', 'tiktok')),
  constraint publication_logs_status_check check (status in ('pending', 'published', 'failed', 'inbox_ready')),
  constraint publication_logs_attempt_check check (attempt >= 1)
);

create table if not exists public.oauth_sessions (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  state text not null,
  status text not null default 'pending',
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint oauth_sessions_platform_check check (platform in ('facebook', 'instagram', 'tiktok')),
  constraint oauth_sessions_status_check check (status in ('pending', 'used', 'expired', 'failed')),
  constraint oauth_sessions_state_unique unique (state)
);

create index if not exists scheduled_posts_status_scheduled_for_idx on public.scheduled_posts (status, scheduled_for);
create index if not exists social_accounts_platform_status_idx on public.social_accounts (platform, status);
create index if not exists oauth_sessions_state_status_idx on public.oauth_sessions (state, status);
create index if not exists publication_logs_scheduled_post_platform_idx on public.publication_logs (scheduled_post_id, platform);

insert into public.social_accounts (platform, status)
values ('facebook', 'disconnected'), ('instagram', 'disconnected'), ('tiktok', 'disconnected')
on conflict (platform) do nothing;

drop trigger if exists social_accounts_touch_updated_at on public.social_accounts;
create trigger social_accounts_touch_updated_at before update on public.social_accounts for each row execute function private.touch_social_updated_at();
drop trigger if exists scheduled_posts_touch_updated_at on public.scheduled_posts;
create trigger scheduled_posts_touch_updated_at before update on public.scheduled_posts for each row execute function private.touch_social_updated_at();

alter table public.social_accounts enable row level security;
alter table public.scheduled_posts enable row level security;
alter table public.publication_logs enable row level security;
alter table public.oauth_sessions enable row level security;

-- No browser-access policies are intentionally created. The n8n instance is the sole data-plane client.
revoke all on table public.social_accounts, public.scheduled_posts, public.publication_logs, public.oauth_sessions from anon, authenticated;
grant select, insert, update, delete on table public.social_accounts, public.scheduled_posts, public.publication_logs, public.oauth_sessions to service_role;
revoke all on function private.sanitize_social_payload(jsonb), private.social_expiry_from_seconds(bigint), private.touch_social_updated_at() from public, anon, authenticated;
grant usage on schema private to service_role;
grant execute on function private.sanitize_social_payload(jsonb), private.social_expiry_from_seconds(bigint) to service_role;