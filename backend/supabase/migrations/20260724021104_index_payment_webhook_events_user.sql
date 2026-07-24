create index if not exists payment_webhook_events_user_id_idx
  on public.payment_webhook_events (user_id);
