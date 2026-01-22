#!/bin/bash
echo "🚀 Starting SADA Quick Start..."

# 1. Check if Backend is running
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ Backend is already running on port 3000."
else
    echo "⚠️ Backend is NOT running. Please start it in a separate terminal:"
    echo "   cd ~/workspace/pets/sada/sada-backend && npm run dev"
    exit 1
fi

# 2. Open iOS Simulator
echo "📱 Opening iOS Simulator..."
open -a Simulator

# 3. Start Expo
echo "⚛️ Starting Expo..."
cd ~/workspace/pets/sada/sada-mobile
npx expo start
