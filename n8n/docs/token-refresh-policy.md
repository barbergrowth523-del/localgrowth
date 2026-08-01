# Token refresh policy

The refresh workflow runs every 30 minutes and selects only TikTok accounts with status `connected` or `error` whose access token expires within two hours.

## Rules

- Never clear the current token before a valid refresh response arrives.
- On success, persist both the new access token and the new refresh token, recalculate both expiries, set `connected`, set `last_refresh_at`, and clear `last_refresh_error`.
- The HTTP node retries transient failures up to three times. For exact 60s, 300s, 900s backoff, add two Wait nodes on the error branch in the imported workflow; the compact export uses n8n built-in retry for portability.
- Responses are recursively sanitized before an error message is persisted.
- If the response indicates a revoked, expired, invalid refresh token, set `status = reconnect_required` and `reconnect_required_at = now()`.
- Permanent provider errors are not automatically retried beyond the configured retry attempts.

## Test safely

1. Connect a test account after TikTok approval.
2. Temporarily set `access_token_expires_at` to within 90 minutes using service-role SQL or REST.
3. Trigger the workflow manually.
4. Verify both token expiry fields and `last_refresh_at` changed, without opening execution data that may contain secrets.
5. Simulate an invalid refresh token only in a test account, then verify `reconnect_required` is set.