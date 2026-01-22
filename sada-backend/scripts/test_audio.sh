#!/bin/bash

API_URL="http://localhost:3000/api"

echo "🚀 Testing Week 3: Audio Integration..."

# 1. Sign In Host
HOST_RES=$(curl -s -X POST $API_URL/auth/signin -H "Content-Type: application/json" -d '{"identityToken": "audio-host", "fullName": "Audio Host"}')
HOST_ID=$(echo $HOST_RES | node -e "const fs = require('fs'); try { console.log(JSON.parse(fs.readFileSync(0)).user.id) } catch(e){}" )
echo "✅ Host Signed In"

# 2. Sign In Listener
LISTENER_RES=$(curl -s -X POST $API_URL/auth/signin -H "Content-Type: application/json" -d '{"identityToken": "audio-listener", "fullName": "Audio Listener"}')
LISTENER_ID=$(echo $LISTENER_RES | node -e "const fs = require('fs'); try { console.log(JSON.parse(fs.readFileSync(0)).user.id) } catch(e){}" )
echo "✅ Listener Signed In"

# 3. Create Room -> Should return audio details
echo "\nTesting Create Room (Audio Check)..."
ROOM_RES=$(curl -s -X POST $API_URL/rooms \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"$HOST_ID\", \"title\": \"Audio Test Room\", \"category\": \"music\"}")

# Parse Audio Provider
AUDIO_PROVIDER=$(echo $ROOM_RES | node -e "const fs = require('fs'); try { console.log(JSON.parse(fs.readFileSync(0)).audio.provider) } catch(e){}" )
ICE_SERVERS_COUNT=$(echo $ROOM_RES | node -e "const fs = require('fs'); try { console.log(JSON.parse(fs.readFileSync(0)).audio.iceServers.length) } catch(e){ console.log(0) }" )
ROOM_ID=$(echo $ROOM_RES | node -e "const fs = require('fs'); try { console.log(JSON.parse(fs.readFileSync(0)).id) } catch(e){}" )

if [ "$AUDIO_PROVIDER" == "cloudflare-calls" ]; then
    echo "✅ Create Room returned Audio Provider: $AUDIO_PROVIDER"
    if [ "$ICE_SERVERS_COUNT" -gt 0 ]; then
        echo "✅ Create Room returned $ICE_SERVERS_COUNT ICE Servers (Real Cloudflare Integration)"
    else
        echo "⚠️ Create Room returned 0 ICE Servers (Check AudioService logs)"
    fi
else
    echo "❌ Create Room missing audio details"
    echo "Response: $ROOM_RES"
    exit 1
fi

# 4. Join Room -> Should return audio details
echo "\nTesting Join Room (Audio Check)..."
JOIN_RES=$(curl -s -X POST $API_URL/rooms/$ROOM_ID/join \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"$LISTENER_ID\"}")

JOIN_AUDIO=$(echo $JOIN_RES | node -e "const fs = require('fs'); try { console.log(JSON.parse(fs.readFileSync(0)).audio.provider) } catch(e){}" )

if [ -z "$JOIN_AUDIO" ]; then 
    # The structure in generateToken is { connectionDetails: ... } it does NOT have provider in generateToken return currently.
    # Let's check for websocketUrl
    WS_URL=$(echo $JOIN_RES | node -e "const fs = require('fs'); try { console.log(JSON.parse(fs.readFileSync(0)).audio.connectionDetails.websocketUrl) } catch(e){}" )
    if [ -n "$WS_URL" ]; then
         echo "✅ Join Room returned Websocket URL: $WS_URL"
    else
         echo "❌ Join Room missing audio details"
         echo "Response: $JOIN_RES"
         exit 1
    fi
else
    echo "✅ Join Room returned Audio Provider: $JOIN_AUDIO"
fi

echo "\n✨ Audio Integration Verified!"
