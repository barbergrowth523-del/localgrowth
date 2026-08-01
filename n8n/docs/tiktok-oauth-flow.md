# TikTok OAuth flow

## Dependencies

The TikTok app is awaiting approval. Do not set a guessed authorization endpoint. `TIKTOK_AUTHORIZATION_URL` is intentionally a required placeholder until the approved TikTok Accounts API documentation for this app supplies the exact URL and required parameters.

The token and refresh endpoints in the workflows are the endpoints provided in the approved implementation specification:

- `POST https://business-api.tiktok.com/open_api/v1.3/tt_user/oauth2/token/`
- `POST https://business-api.tiktok.com/open_api/v1.3/tt_user/oauth2/refresh_token/`

TikTok API for Business documentation notes that app approval is required before using authorization code flows. Reference: https://ads.tiktok.com/gateway/docs/index?doc_id=1738855242728450

## Start

`GET /webhook/tiktok-oauth-start` generates a 256-bit state, stores it with a ten-minute expiry in `oauth_sessions`, and returns an authorization URL. The implementation intentionally returns JSON rather than performing a blind redirect. Place an operator UI or Nginx redirect in front of it after verifying the exact n8n Respond to Webhook redirect support for the installed n8n version.

## Callback validation

The callback accepts `auth_code` (or `code`) and `state`. Before exchanging any code it verifies:

- both values exist;
- state belongs to TikTok;
- state is pending;
- state has not expired;
- state has not already been used.

Only a TikTok response with success code `0`, access token and refresh token is persisted. The state is marked `used` only after the account upsert succeeds. Tokens are never sent in the final webhook response.

## Error behaviour

For production, configure each callback node error branch to the `10 - Respond Error` node in the n8n UI. Its response must use `PRONTUSFY_SOCIAL_ERROR_URL` or a generic message and must never echo provider responses. The export leaves workflows inactive because the exact error-output wiring differs between n8n versions.