# Social media test plan

Run all tests using test accounts and n8n test URLs before activating production workflows. Never include tokens in screenshots, tickets, execution exports, or commit messages.

## OAuth callback

| Case | Expected result |
| --- | --- |
| Callback without code | Generic error response; no account update |
| Callback without state | Generic error response; no account update |
| Unknown state | Generic error response; no token request |
| Expired state | Generic error response; no token request |
| Reused state | Generic error response; no token request |
| TikTok non-zero response code | Generic error response; no token stored |
| Valid response | TikTok row is `connected`; state is `used`; no token returned to browser |

## Refresh

| Case | Expected result |
| --- | --- |
| Token expires within two hours | Selected and refreshed |
| Token valid for more than two hours | Not selected |
| Refresh returns new refresh token | Both token values and both expiry timestamps change |
| Transient provider failure | At most three retries; sanitized error persisted |
| Revoked or expired refresh token | `reconnect_required` and timestamp are set |

## Scheduled publisher

| Case | Expected result |
| --- | --- |
| No due post | No WF-07 execution |
| One due post | Atomic claim changes `pending` to `processing` before WF-07 runs |
| Future post | Not selected |
| Two scheduler executions | Only one conditional claim succeeds |
| All platform records succeed | `published` |
| Some records fail | `partially_published` |
| All records fail or timeout | `failed`; store only sanitized error details |
| TikTok `inbox_ready` | Store its status as a publication log, do not report a full publish |

## Security checks

1. Query each social table with publishable/anon and authenticated credentials: access must be denied or return no rows.
2. Query with service role from n8n only: workflow operation succeeds.
3. Search the repository and exported workflow JSON for actual token prefixes, `client_secret` values, `Authorization`, and service keys.
4. Confirm `publication_logs.response_sanitized` contains `[REDACTED]` for sensitive fields.
5. Confirm n8n execution retention and error workflows do not retain raw provider responses.