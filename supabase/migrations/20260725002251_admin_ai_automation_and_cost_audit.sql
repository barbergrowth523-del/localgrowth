create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null check (feature in ('admin_support_draft', 'merchant_message_variation', 'support_chat')),
  model text not null default 'openai/gpt-5.4',
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  estimated_cost_brl numeric(12, 6) not null default 0 check (estimated_cost_brl >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_events_user_created_at_idx
  on public.ai_usage_events (user_id, created_at desc);
create index if not exists ai_usage_events_created_at_idx
  on public.ai_usage_events (created_at desc);

alter table public.ai_usage_events enable row level security;
revoke all on public.ai_usage_events from anon, authenticated;

create policy "super admins can read ai usage events"
  on public.ai_usage_events for select to authenticated
  using (private.is_super_admin());

create table if not exists public.admin_system_alert_state (
  service text primary key,
  last_status text not null check (last_status in ('operational', 'degraded', 'down', 'not_configured')),
  last_latency_ms integer,
  last_alert_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.admin_system_alert_state enable row level security;
revoke all on public.admin_system_alert_state from anon, authenticated;

alter table public.admin_broadcasts
  add column if not exists display_mode text not null default 'banner'
  check (display_mode in ('banner', 'popup'));

alter table public.admin_audit_log
  drop constraint if exists admin_audit_log_action_check;

alter table public.admin_audit_log
  add constraint admin_audit_log_action_check check (action in (
    'block_access', 'unblock_access', 'grant_courtesy', 'impersonate_preview_opened',
    'change_plan', 'update_support_status', 'update_plan_config', 'create_coupon',
    'bulk_extend_trial', 'publish_broadcast', 'archive_broadcast',
    'generate_ai_support_draft', 'send_system_alert'
  ));