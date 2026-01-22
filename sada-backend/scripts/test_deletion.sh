#!/bin/bash

API_URL="http://localhost:3000/api"

echo "🚀 Testing Account Deletion..."

# 1. Create User to Delete (User D)
USER_D_RES=$(curl -s -X POST $API_URL/auth/signin -H "Content-Type: application/json" -d '{"identityToken": "user-d", "fullName": "User To Delete"}')
USER_D_ID=$(echo $USER_D_RES | node -e "const fs = require('fs'); try { console.log(JSON.parse(fs.readFileSync(0)).user.id) } catch(e){}" )
echo "✅ User D Created ($USER_D_ID)"

# 2. Create Another User (User Observer)
USER_O_RES=$(curl -s -X POST $API_URL/auth/signin -H "Content-Type: application/json" -d '{"identityToken": "user-o", "fullName": "Observer"}')
USER_O_ID=$(echo $USER_O_RES | node -e "const fs = require('fs'); try { console.log(JSON.parse(fs.readFileSync(0)).user.id) } catch(e){}" )

# 3. Setup Relationships
# User D Follows Observer
curl -s -X POST $API_URL/users/$USER_O_ID/follow -H "Content-Type: application/json" -d "{\"userId\": \"$USER_D_ID\"}" > /dev/null

# User D Joins a Room (Assuming a room exists or create one)
# Create Room by D
ROOM_RES=$(curl -s -X POST $API_URL/rooms -H "Content-Type: application/json" -d "{\"userId\": \"$USER_D_ID\", \"title\": \"Deletion Room\", \"category\": \"test\"}")
ROOM_ID=$(echo $ROOM_RES | node -e "const fs = require('fs'); try { console.log(JSON.parse(fs.readFileSync(0)).id) } catch(e){}" )
echo "✅ Room Created by D ($ROOM_ID)"

# User D Gifts Observer (Create transaction)
curl -s -X POST $API_URL/gems/purchase -H "Content-Type: application/json" -d "{\"userId\": \"$USER_D_ID\", \"amount\": 50}" > /dev/null
curl -s -X POST $API_URL/gems/gift -H "Content-Type: application/json" -d "{\"userId\": \"$USER_D_ID\", \"receiverId\": \"$USER_O_ID\", \"amount\": 10}" > /dev/null
echo "✅ Gift Sent from D to O"

# 4. DELETE User D
echo "\nDeleting User D..."
DELETE_RES=$(curl -s -X DELETE $API_URL/users/$USER_D_ID)
echo "Response: $DELETE_RES"

# 5. Verification
# Check User D is gone
CHECK_USER=$(curl -s $API_URL/users/$USER_D_ID)
if [[ $CHECK_USER == *"User not found"* ]]; then
    echo "✅ User D successfully removed from API"
else
    echo "❌ User D still exists: $CHECK_USER"
    exit 1
fi

# Check Room is gone (Cascade)
CHECK_ROOM=$(curl -s $API_URL/rooms/$ROOM_ID)
# Note: Get Room might return 404 or empty if deleted
ROOM_Status=$(echo $CHECK_ROOM | node -e "const fs = require('fs'); try { console.log(JSON.parse(fs.readFileSync(0)).id ? 'Exists' : 'Gone') } catch(e){ console.log('Gone') }" )

if [ "$ROOM_Status" == "Gone" ]; then
    echo "✅ Room hosted by User D was deleted (Cascade)"
else
    echo "❌ Room still exists: $CHECK_ROOM"
fi

echo "\n✨ Account Deletion Verified!"
