# Rollback

## Stop automation first

1. Deactivate `WF-SM-SCHEDULED-PUBLISHER`.
2. Deactivate `WF-SM-TIKTOK-TOKEN-REFRESH`.
3. Disable or protect the two OAuth webhooks at Nginx.
4. Rotate `TIKTOK_CLIENT_SECRET` if it may have appeared in execution data.

## Data rollback

Do not drop production tables as a first response. Set every `social_accounts.status` to `disconnected` and rotate/clear tokens through a controlled service-role operation if the integration must be disabled.

Only after a backup and explicit approval should an operator run:

```sql
drop table if exists public.publication_logs;
drop table if exists public.scheduled_posts;
drop table if exists public.oauth_sessions;
drop table if exists public.social_accounts;
drop function if exists private.sanitize_social_payload(jsonb);
drop function if exists private.social_expiry_from_seconds(bigint);
drop function if exists private.touch_social_updated_at();
```

This is destructive and removes publication history. Restore from a verified Supabase backup if necessary.