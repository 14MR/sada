# Cloudflare TURN Credentials

**Turn Key ID**: `YOUR_TURN_KEY_ID_HERE`
**API Token**: `YOUR_API_TOKEN_HERE`

## Usage for ICE Server Generation

To generate short-lived credentials for a TURN user:

```bash
curl \
	-H "Authorization: Bearer YOUR_API_TOKEN_HERE" \
	-H "Content-Type: application/json" -d '{"ttl": 86400}' \
	https://rtc.live.cloudflare.com/v1/turn/keys/YOUR_TURN_KEY_ID_HERE/credentials/generate-ice-servers
```
}
```

## How to Get Credentials

1. Go to the Cloudflare Dashboard (https://dash.cloudflare.com/)
2. Navigate to **Turnstile** → **TURN** in the left sidebar
3. Create a new TURN key if you don't have one
4. Copy the **Turn Key ID** from the key details
5. Create an API Token with the required permissions:
   - Go to **My Profile** → **API Tokens**
   - Click "Create Token"
   - Use the "Turnstile TURN" template or create custom token with:
     - Account - Turnstile - Edit
     - Account - Turnstile - Read
6. Paste the credentials into your `.env` file as:
   - `CLOUDFLARE_TURN_KEY_ID=YOUR_TURN_KEY_ID_HERE`
   - `CLOUDFLARE_API_TOKEN=YOUR_API_TOKEN_HERE`

