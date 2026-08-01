# Social media module setup

This module controls only the official Prontusfy Facebook, Instagram and TikTok accounts. It is not multi-tenant and must not be exposed in the merchant frontend.

## 1. Apply the database migration

Apply `supabase/migrations/20260801131233_social_media_core.sql` using the Supabase CLI or SQL Editor. The migration creates `social_accounts`, `scheduled_posts`, `publication_logs` and `oauth_sessions` and seeds disconnected records for the three official platforms.

RLS is enabled on every table. `anon` and `authenticated` have no privileges. Only `service_role` can use the REST endpoints, so never use `SUPABASE_SERVICE_KEY` in Next.js, a browser, workflow logs, or exported credentials.

## 2. Configure `/opt/n8n/.env`

Use the placeholders in the repository `.env.example`. Populate values only on the server, then restart the n8n Docker Compose stack. Do not paste values into Code nodes or workflow JSON.

Required values:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `TIKTOK_CLIENT_ID`
- `TIKTOK_CLIENT_SECRET`
- `TIKTOK_AUTHORIZATION_URL`
- `TIKTOK_REDIRECT_URI=https://n8n.prontusfy.com.br/webhook/tiktok-oauth-callback`
- `PRONTUSFY_SOCIAL_SUCCESS_URL`
- `PRONTUSFY_SOCIAL_ERROR_URL`

The OAuth start Code node uses Node `crypto`. If the n8n Code node cannot load the built-in module, enable the `crypto` built-in for Code nodes according to the n8n version in use, then restart. Do not enable arbitrary external modules.

## 3. Import and configure workflows

Import each JSON from `n8n/workflows/` while inactive:

1. `WF-SM-TIKTOK-OAUTH-START.json`
2. `WF-SM-TIKTOK-OAUTH-CALLBACK.json`
3. `WF-SM-TIKTOK-TOKEN-REFRESH.json`
4. `WF-SM-SCHEDULED-PUBLISHER.json`

Set the real workflow ID for `WF-07 Social Publisher Master` in node `06 - Execute WF-07 Social Publisher Master`. This is intentionally a placeholder because the WF-07 export is not in this repository.

Protect `tiktok-oauth-start` at Nginx or in n8n with a private operator-only control. The callback remains public by design but accepts only a short-lived, single-use state.

## 4. Validate before activation

- Use n8n test URLs first.
- Check that the start endpoint returns only `authorization_url` and never a secret.
- Check `social_accounts` only through service role and confirm browser roles cannot read token columns.
- Activate the callback only after the TikTok app and redirect URI are approved.
- Activate refresh and publisher schedules only after a successful TikTok connection.

## 5. Operational security

Do not enable "save execution progress" or "save successful executions" for nodes carrying token responses unless your n8n execution data store is encrypted and retention is tightly controlled. Prefer error-only, short retention and inspect logs only after sanitization.

Run `n8n audit` after importing the workflows and after n8n upgrades.