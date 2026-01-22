# Cloudflare TURN Credentials

**Turn Key ID**: `7d4ab122357ca883ff212d09f1cbf856`
**API Token**: `c7a14148ccad31352df1b25b2fb8e7137c7b9143c1dd2c5dcfef7d584b5e3d87`

## Usage for ICE Server Generation

To generate short-lived credentials for a TURN user:

```bash
curl \
	-H "Authorization: Bearer c7a14148ccad31352df1b25b2fb8e7137c7b9143c1dd2c5dcfef7d584b5e3d87" \
	-H "Content-Type: application/json" -d '{"ttl": 86400}' \
	https://rtc.live.cloudflare.com/v1/turn/keys/7d4ab122357ca883ff212d09f1cbf856/credentials/generate-ice-servers
```

## Response Format

The frontend (or backend proxy) receives this JSON to configure `RTCPeerConnection`:

```json
{
	"iceServers": [
    {
      "urls": [
        "stun:stun.cloudflare.com:3478",
        "turn:turn.cloudflare.com:3478?transport=udp",
        "turn:turn.cloudflare.com:3478?transport=tcp",
        "turns:turn.cloudflare.com:5349?transport=tcp"
      ],
      "username": "xxxx",
      "credential": "yyyy"
    }
  ]
}
```
