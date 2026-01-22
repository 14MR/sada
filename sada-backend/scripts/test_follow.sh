#!/bin/bash

API_URL="http://localhost:3000/api"

echo "🚀 Testing Week 4: Follow System..."

# 1. Sign In User A (Follower)
USER_A_RES=$(curl -s -X POST $API_URL/auth/signin -H "Content-Type: application/json" -d '{"identityToken": "user-a", "fullName": "User A"}')
USER_A_ID=$(echo $USER_A_RES | node -e "const fs = require('fs'); try { console.log(JSON.parse(fs.readFileSync(0)).user.id) } catch(e){}" )
echo "✅ User A Signed In ($USER_A_ID)"

# 2. Sign In User B (Following)
USER_B_RES=$(curl -s -X POST $API_URL/auth/signin -H "Content-Type: application/json" -d '{"identityToken": "user-b", "fullName": "User B"}')
USER_B_ID=$(echo $USER_B_RES | node -e "const fs = require('fs'); try { console.log(JSON.parse(fs.readFileSync(0)).user.id) } catch(e){}" )
echo "✅ User B Signed In ($USER_B_ID)"

# 3. User A Follows User B
echo "\nTesting Follow..."
FOLLOW_Res=$(curl -s -X POST $API_URL/users/$USER_B_ID/follow \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"$USER_A_ID\"}")

echo "Response: $FOLLOW_Res"
if [[ $FOLLOW_Res == *"success"* ]]; then
    echo "✅ Follow Successful"
else
    echo "❌ Follow Failed"
    exit 1
fi

# 4. List User A's Following -> Should contain User B
echo "\nTesting List Following..."
FOLLOWING_RES=$(curl -s $API_URL/users/$USER_A_ID/following)
# Check if User B's ID is in the response
if [[ $FOLLOWING_RES == *"$USER_B_ID"* ]]; then
     echo "✅ List Following Successful (Found User B)"
else
     echo "❌ List Following Failed"
     echo "Response: $FOLLOWING_RES"
     exit 1
fi

# 5. List User B's Followers -> Should contain User A
echo "\nTesting List Followers..."
FOLLOWERS_RES=$(curl -s $API_URL/users/$USER_B_ID/followers)
if [[ $FOLLOWERS_RES == *"$USER_A_ID"* ]]; then
     echo "✅ List Followers Successful (Found User A)"
else
     echo "❌ List Followers Failed"
     echo "Response: $FOLLOWERS_RES"
     exit 1
fi

# 6. User A Unfollows User B
echo "\nTesting Unfollow..."
UNFOLLOW_RES=$(curl -s -X DELETE $API_URL/users/$USER_B_ID/follow \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"$USER_A_ID\"}")

if [[ $UNFOLLOW_RES == *"success"* ]]; then
     echo "✅ Unfollow Successful"
else
     echo "❌ Unfollow Failed"
     exit 1
fi

# 7. Check Following List Again (Should be empty of User B)
CHECK_RES=$(curl -s $API_URL/users/$USER_A_ID/following)
if [[ $CHECK_RES != *"$USER_B_ID"* ]]; then
     echo "✅ Verify Unfollow Successful (User B gone)"
else
     echo "❌ Verify Unfollow Failed (User B still present)"
     echo "Response: $CHECK_RES"
     exit 1
fi

echo "\n✨ Follow System Verified!"
