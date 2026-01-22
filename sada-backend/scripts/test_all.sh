#!/bin/bash

echo "🚀 Running ALL Verification Tests..."

echo "\n--------------------------------------------------"
echo "1. Basic Local Test (Auth & Profile)"
./scripts/test_local.sh || { echo "❌ test_local failed"; exit 1; }

echo "\n--------------------------------------------------"
echo "2. Speakers & Roles Test"
./scripts/test_speakers.sh || { echo "❌ test_speakers failed"; exit 1; }

echo "\n--------------------------------------------------"
echo "3. Audio Integration Test (Mock/Real TURN)"
./scripts/test_audio.sh || { echo "❌ test_audio failed"; exit 1; }

echo "\n--------------------------------------------------"
echo "4. Follow System Test"
./scripts/test_follow.sh || { echo "❌ test_follow failed"; exit 1; }

echo "\n--------------------------------------------------"
echo "5. Gems System Test"
./scripts/test_gems.sh || { echo "❌ test_gems failed"; exit 1; }

echo "\n--------------------------------------------------"
echo "6. Chat System Test"
node scripts/test_chat.js || { echo "❌ test_chat failed"; exit 1; }

echo "\n--------------------------------------------------"
echo "7. Notifications Test"
node scripts/test_notifications.js || { echo "❌ test_notifications failed"; exit 1; }

echo "\n--------------------------------------------------"
echo "8. Account Deletion Test"
./scripts/test_deletion.sh || { echo "❌ test_deletion failed"; exit 1; }


echo "\n✨✨✨ ALL TESTS PASSED! SADA BACKEND MVP IS READY! ✨✨✨"
