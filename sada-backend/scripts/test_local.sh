#!/bin/bash

# Base URL
API_URL="http://localhost:3000/api"

echo "🚀 Starting SADA Backend Tests - Week 2..."

# 1. Test Health Check
echo "\nChecking Server Health..."
curl -s http://localhost:3000/ | grep "SADA Backend is running" && echo "✅ Server is UP" || echo "❌ Server is DOWN"

# 2. Test Sign In (Apple Mock)
echo "\nTesting Sign In..."
RESPONSE=$(curl -s -X POST $API_URL/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"identityToken": "test-apple-token-123", "fullName": "Test User"}')

USER_ID=$(echo $RESPONSE | node -e "const fs = require('fs'); const input = fs.readFileSync(0, 'utf-8'); try { const json = JSON.parse(input); console.log(json.user.id); } catch (e) { console.error(e); }")

if [ -z "$USER_ID" ]; then
  echo "❌ Sign In Failed"
  exit 1
else
  echo "✅ Sign In Successful. User ID: $USER_ID"
fi

# 3. Test Create Room
echo "\nTesting Create Room..."
ROOM_RESPONSE=$(curl -s -X POST $API_URL/rooms \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"$USER_ID\", \"title\": \"My First Arabic Room\", \"category\": \"talk\", \"description\": \"A room to discuss tech in Arabic\"}")

# echo "Room Response: $ROOM_RESPONSE"
# echo "Room Response: $ROOM_RESPONSE"
ROOM_ID=$(echo $ROOM_RESPONSE | node -e "const fs = require('fs'); const input = fs.readFileSync(0, 'utf-8'); try { const json = JSON.parse(input); console.log(json.id); } catch (e) { console.error(e); }")

if [ -z "$ROOM_ID" ]; then
    echo "❌ Create Room Failed"
    exit 1
else
    echo "✅ Create Room Successful. Room ID: $ROOM_ID"
fi

# 4. Test List Rooms
echo "\nTesting List Rooms..."
curl -s $API_URL/rooms | grep "My First Arabic Room" && echo "✅ List Rooms Successful" || echo "❌ List Rooms Failed"

# 5. Test Get Room
echo "\nTesting Get Room..."
curl -s $API_URL/rooms/$ROOM_ID | grep "My First Arabic Room" && echo "✅ Get Room Successful" || echo "❌ Get Room Failed"

# 6. Test End Room
echo "\nTesting End Room..."
curl -s -X POST $API_URL/rooms/$ROOM_ID/end \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"$USER_ID\"}" | grep "success" && echo "✅ End Room Successful" || echo "❌ End Room Failed"

echo "\n✨ All Tests Completed!"
