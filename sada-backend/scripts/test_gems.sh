#!/bin/bash

API_URL="http://localhost:3000/api"

echo "🚀 Testing Week 5: Gems System..."

# 1. Sign In User A (Payer)
USER_A_RES=$(curl -s -X POST $API_URL/auth/signin -H "Content-Type: application/json" -d '{"identityToken": "gem-user-a", "fullName": "Gem User A"}')
USER_A_ID=$(echo $USER_A_RES | node -e "const fs = require('fs'); try { console.log(JSON.parse(fs.readFileSync(0)).user.id) } catch(e){}" )
echo "✅ User A Signed In ($USER_A_ID)"

# 2. Sign In User B (Receiver)
USER_B_RES=$(curl -s -X POST $API_URL/auth/signin -H "Content-Type: application/json" -d '{"identityToken": "gem-user-b", "fullName": "Gem User B"}')
USER_B_ID=$(echo $USER_B_RES | node -e "const fs = require('fs'); try { console.log(JSON.parse(fs.readFileSync(0)).user.id) } catch(e){}" )
echo "✅ User B Signed In ($USER_B_ID)"

# 3. User A Purchases 100 Gems
echo "\nTesting Purchase..."
PURCHASE_RES=$(curl -s -X POST $API_URL/gems/purchase \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"$USER_A_ID\", \"amount\": 100}")

# Verify Balance
BALANCE_A=$(curl -s $API_URL/gems/balance/$USER_A_ID | node -e "const fs = require('fs'); try { console.log(JSON.parse(fs.readFileSync(0)).balance) } catch(e){}" )
echo "User A Balance: $BALANCE_A"

if [ "$BALANCE_A" -ge 100 ]; then
     echo "✅ Purchase Successful"
else
     echo "❌ Purchase Failed"
     echo "Response: $PURCHASE_RES"
     exit 1
fi

# 4. User A Gifts 50 Gems to User B
echo "\nTesting Gift..."
GIFT_RES=$(curl -s -X POST $API_URL/gems/gift \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"$USER_A_ID\", \"receiverId\": \"$USER_B_ID\", \"amount\": 50}")

# Verify Balances
BALANCE_A_NEW=$(curl -s $API_URL/gems/balance/$USER_A_ID | node -e "const fs = require('fs'); try { console.log(JSON.parse(fs.readFileSync(0)).balance) } catch(e){}" )
BALANCE_B_NEW=$(curl -s $API_URL/gems/balance/$USER_B_ID | node -e "const fs = require('fs'); try { console.log(JSON.parse(fs.readFileSync(0)).balance) } catch(e){}" )

echo "User A New Balance: $BALANCE_A_NEW (Expected: Old - 50)"
echo "User B New Balance: $BALANCE_B_NEW (Expected: +50)"

if [ "$BALANCE_A_NEW" -eq "$((BALANCE_A - 50))" ] && [ "$BALANCE_B_NEW" -ge 50 ]; then
     echo "✅ Gift Successful"
else
     echo "❌ Gift Failed"
     echo "Response: $GIFT_RES"
     exit 1
fi

# 5. Check History
echo "\nTesting History..."
HISTORY_RES=$(curl -s $API_URL/gems/history/$USER_A_ID)
HISTORY_COUNT=$(echo $HISTORY_RES | node -e "const fs = require('fs'); try { console.log(JSON.parse(fs.readFileSync(0)).length) } catch(e){ console.log(0) }" )

if [ "$HISTORY_COUNT" -ge 2 ]; then
     echo "✅ History Verified ($HISTORY_COUNT transactions)"
else
     echo "❌ History Check Failed"
     echo "Response: $HISTORY_RES"
     exit 1
fi

echo "\n✨ Gems System Verified!"
