#!/bin/bash

# Base URL
API_URL="http://localhost:3000/api"

echo "🚀 Starting SADA Backend Tests - Week 3 (Speaker Permissions)..."

# 1. Sign In Host
echo "\nTesting Sign In (Host)..."
HOST_RES=$(curl -s -X POST $API_URL/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"identityToken": "host-token", "fullName": "Host User"}')

HOST_ID=$(echo $HOST_RES | node -e "const fs = require('fs'); const input = fs.readFileSync(0, 'utf-8'); try { const json = JSON.parse(input); console.log(json.user.id); } catch (e) { console.error(e); }")
echo "✅ Host ID: $HOST_ID"

# 2. Sign In Listener
echo "\nTesting Sign In (Listener)..."
LISTENER_RES=$(curl -s -X POST $API_URL/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"identityToken": "listener-token", "fullName": "Listener User"}')

LISTENER_ID=$(echo $LISTENER_RES | node -e "const fs = require('fs'); const input = fs.readFileSync(0, 'utf-8'); try { const json = JSON.parse(input); console.log(json.user.id); } catch (e) { console.error(e); }")
echo "✅ Listener ID: $LISTENER_ID"

# 3. Create Room (by Host)
echo "\nTesting Create Room..."
ROOM_RES=$(curl -s -X POST $API_URL/rooms \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"$HOST_ID\", \"title\": \"Speaker Managed Room\", \"category\": \"talk\"}")

ROOM_ID=$(echo $ROOM_RES | node -e "const fs = require('fs'); const input = fs.readFileSync(0, 'utf-8'); try { const json = JSON.parse(input); console.log(json.id); } catch (e) { console.error(e); }")
echo "✅ Room ID: $ROOM_ID"

# 4. Join Room (by Listener)
echo "\nTesting Join Room..."
curl -s -X POST $API_URL/rooms/$ROOM_ID/join \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"$LISTENER_ID\"}" > /dev/null
echo "✅ Listener joined"

# 5. Promote Listener to Speaker (by Host)
echo "\nTesting Promote to Speaker..."
PROMOTE_RES=$(curl -s -X POST $API_URL/rooms/$ROOM_ID/speakers \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"$HOST_ID\", \"targetUserId\": \"$LISTENER_ID\", \"role\": \"speaker\"}")

NEW_ROLE=$(echo $PROMOTE_RES | node -e "const fs = require('fs'); const input = fs.readFileSync(0, 'utf-8'); try { const json = JSON.parse(input); console.log(json.role); } catch (e) { console.error(e); }")

if [ "$NEW_ROLE" == "speaker" ]; then
  echo "✅ Promotion Successful (Role: $NEW_ROLE)"
else
  echo "❌ Promotion Failed: $PROMOTE_RES"
  exit 1
fi

# 6. End Room
curl -s -X POST $API_URL/rooms/$ROOM_ID/end -H "Content-Type: application/json" -d "{\"userId\": \"$HOST_ID\"}" > /dev/null
echo "\n✨ All Tests Completed!"
