# WF-07C TikTok token injection

The WF-07C export is not present in this repository. Do not replace it. Insert the following nodes immediately before its existing `02 - Prepare TikTok Publish` node and connect the final node to that existing node.

## Required nodes

1. `01A - Load TikTok Social Account` - HTTP Request GET
   - URL: `={{ $env.SUPABASE_URL + '/rest/v1/social_accounts?select=id,account_id,access_token,refresh_token,access_token_expires_at,refresh_token_expires_at,status&platform=eq.tiktok' }}`
   - Header: `apikey: ={{ $env.SUPABASE_SERVICE_KEY }}`
2. `01B - Validate TikTok Account` - Code
3. `01C - Needs Immediate Refresh?` - IF using `needs_refresh`.
4. On true, use the refresh request and update nodes from `WF-SM-TIKTOK-TOKEN-REFRESH`; then re-load the account. Do not call an arbitrary workflow by name.
5. `01D - Inject TikTok Publisher Config` - Code.

Configure each sensitive HTTP node to avoid saving successful execution data. Never attach its input to a Set node or logging node.

## 01B - Validate TikTok Account code

```javascript
const original = $input.first().json;
const rows = $('01A - Load TikTok Social Account').first().json;
const account = Array.isArray(rows) ? rows[0] : rows;

if (!account?.access_token || !account?.account_id) {
  return [{ json: { ...original, publication_record: { platform: 'tiktok', status: 'failed', success: false, error_code: 'TIKTOK_ACCESS_TOKEN_NOT_CONFIGURED', error_message: 'TikTok access token is not configured' }, stop_tiktok_publish: true } }];
}

if (account.status === 'reconnect_required') {
  return [{ json: { ...original, publication_record: { platform: 'tiktok', status: 'failed', success: false, error_code: 'TIKTOK_RECONNECT_REQUIRED', error_message: 'TikTok account must be reconnected' }, stop_tiktok_publish: true } }];
}

if (account.status !== 'connected' && account.status !== 'error') {
  return [{ json: { ...original, publication_record: { platform: 'tiktok', status: 'failed', success: false, error_code: 'TIKTOK_ACCOUNT_NOT_CONNECTED', error_message: 'TikTok account is not connected' }, stop_tiktok_publish: true } }];
}

const expiresAt = new Date(account.access_token_expires_at).getTime();
const needsRefresh = !Number.isFinite(expiresAt) || expiresAt - Date.now() < 15 * 60 * 1000;
return [{ json: { ...original, social_account_id: account.id, tiktok_open_id: account.account_id, needs_refresh: needsRefresh, stop_tiktok_publish: false } }];
```

## 01D - Inject TikTok Publisher Config code

```javascript
const original = $input.first().json;
const rows = $('01A - Load TikTok Social Account').first().json;
const account = Array.isArray(rows) ? rows[0] : rows;

if (!account?.access_token || !account?.refresh_token || !account?.account_id || account.status !== 'connected') {
  return [{ json: { ...original, publication_record: { platform: 'tiktok', status: 'failed', success: false, error_code: account?.status === 'reconnect_required' ? 'TIKTOK_RECONNECT_REQUIRED' : 'TIKTOK_ACCESS_TOKEN_NOT_CONFIGURED', error_message: account?.status === 'reconnect_required' ? 'TikTok account must be reconnected' : 'TikTok access token is not configured' }, stop_tiktok_publish: true } }];
}

return [{ json: {
  ...original,
  stop_tiktok_publish: false,
  publisher_config: {
    ...(original.publisher_config || {}),
    tiktok_access_token: account.access_token,
    tiktok_refresh_token: account.refresh_token,
    tiktok_open_id: account.account_id,
  },
} }];
```

If `stop_tiktok_publish` is true, route that branch to the normal WF-07 Master result aggregator. Do not throw an unhandled error: Facebook and Instagram must continue publishing independently.